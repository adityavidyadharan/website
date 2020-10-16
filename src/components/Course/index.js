import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  faAngleDown,
  faAngleUp,
  faShareAlt,
  faPalette,
  faPlus,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { classes, getContentClassName } from '../../utils';
import { ActionRow, Instructor, Palette, PrereqHeader } from '..';
import './stylesheet.scss';
import { TermContext } from '../../contexts';

export function Course({ className, courseId, onAddCourse }) {
  const [expanded, setExpanded] = useState(false);
  const [prereqOpen, setPrereqOpen] = useState(false);
  const [paletteShown, setPaletteShown] = useState(false);
  const [gpaMap, setGpaMap] = useState({});
  const isSearching = Boolean(onAddCourse);
  const [
    { oscar, desiredCourses, pinnedCrns, excludedCrns, colorMap },
    { patchTermData }
  ] = useContext(TermContext);

  useEffect(() => {
    if (!isSearching) {
      const course = oscar.findCourse(courseId);
      course.fetchGpa().then(setGpaMap);
    }
  }, [isSearching, oscar, courseId]);

  const handleRemoveCourse = useCallback(
    (course) => {
      patchTermData({
        desiredCourses: desiredCourses.filter(
          (courseId) => courseId !== course.id
        ),
        pinnedCrns: pinnedCrns.filter(
          (crn) => !course.sections.some((section) => section.crn === crn)
        ),
        excludedCrns: excludedCrns.filter(
          (crn) => !course.sections.some((section) => section.crn === crn)
        ),
        colorMap: { ...colorMap, [course.id]: undefined }
      });
    },
    [desiredCourses, pinnedCrns, excludedCrns, colorMap, patchTermData]
  );

  const handleIncludeSections = useCallback(
    (sections) => {
      const crns = sections.map((section) => section.crn);
      patchTermData({
        excludedCrns: excludedCrns.filter((crn) => !crns.includes(crn))
      });
    },
    [excludedCrns, patchTermData]
  );

  const course = oscar.findCourse(courseId);
  const color = colorMap[course.id];
  const contentClassName = color && getContentClassName(color);
  const prereqs = course.prereqs.slice(1, course.prereqs.length);

  const instructorMap = {};
  course.sections.forEach((section) => {
    const [primaryInstructor = 'Not Assigned'] = section.instructors;
    if (!(primaryInstructor in instructorMap)) {
      instructorMap[primaryInstructor] = [];
    }
    instructorMap[primaryInstructor].push(section);
  });

  const instructors = Object.keys(instructorMap);
  const excludedInstructors = instructors.filter((instructor) => {
    const sections = instructorMap[instructor];
    return sections.every((section) => excludedCrns.includes(section.crn));
  });
  const includedInstructors = instructors.filter(
    (instructor) => !excludedInstructors.includes(instructor)
  );

  const prereqControl = (pre, exp) => { setPrereqOpen(pre); setExpanded(exp); }
  const prereqAction = {
    icon: faShareAlt,
    styling: { transform: "rotate(90deg)" },
    onClick: () => { prereqControl(true, !prereqOpen ? true : !expanded) }
  }

  const pinnedSections = course.sections.filter((section) =>
    pinnedCrns.includes(section.crn)
  );
  const totalCredits = pinnedSections.reduce(
    (credits, section) => credits + section.credits,
    0
  );

  return (
    <div
      className={classes('Course', contentClassName, 'default', className)}
      style={{ backgroundColor: color }}
      key={course.id}
    >
      <ActionRow
        label={[
          course.id,
          pinnedSections.map((section) => section.id).join(', ')
        ].join(' ')}
        actions={
          isSearching
            ? [
                { icon: faPlus, onClick: onAddCourse },
                prereqAction
              ]
            : [
                {
                  icon: expanded ? faAngleUp : faAngleDown,
                  onClick: () => { prereqControl(false, !expanded); }
                },
                prereqAction,
                {
                  icon: faPalette,
                  onClick: () => setPaletteShown(!paletteShown)
                },
                { icon: faTrash, onClick: () => handleRemoveCourse(course) }
              ]
        }
      >
        <div className="course-row">
          <span
            className="course-title"
            dangerouslySetInnerHTML={{ __html: course.title }}
          />
          <span className="section-crns">
            {pinnedSections.map((section) => section.crn).join(', ')}
          </span>
        </div>
        {!isSearching && (
          <div className="course-row">
            <span className="gpa">
              Course GPA: {Object.keys(gpaMap).length === 0 ? "Loading..."
                : (gpaMap.averageGpa ? gpaMap.averageGpa.toFixed(2) : "N/A")}
            </span>
            {totalCredits > 0 && (
              <span className="credits">{totalCredits} Credits</span>
            )}
          </div>
        )}
        {paletteShown && (
          <Palette
            className="palette"
            onSelectColor={(color) =>
              patchTermData({ colorMap: { ...colorMap, [courseId]: color } })
            }
            color={color}
            onMouseLeave={() => setPaletteShown(false)}
          />
        )}
      </ActionRow>
      {expanded && !prereqOpen && (
        <div className={classes('hover-container', 'nested')}>
          {includedInstructors.map((name) => (
            <Instructor
              key={name}
              color={color}
              name={name}
              sections={instructorMap[name]}
              gpa={Object.keys(gpaMap).length === 0 ? "Loading..."
                : (gpaMap[name] ? gpaMap[name].toFixed(2) : "N/A")}
            />
          ))}
          {excludedInstructors.length > 0 && (
            <div className="excluded-instructor-container">
              {excludedInstructors.map((name) => (
                <span
                  className="excluded-instructor"
                  key={name}
                  onClick={() => handleIncludeSections(instructorMap[name])}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {expanded && prereqOpen && (
        <div className={classes('hover-container')}>
          <PrereqHeader course={course} />
          {prereqs.length > 1 &&
            prereqs.map((req, i) => (
              <div key={i} className={classes(
                !desiredCourses.includes(course.id) && 'dark-content',
                'hover-container',
                'nested'
              )}>
                <PrereqHeader
                  course={course}
                  requirement={req}
                  option={i+1}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
