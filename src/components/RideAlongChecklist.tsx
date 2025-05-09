'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, Mail, FileText, ChevronDown, ChevronUp, CheckSquare } from 'lucide-react';

// Polyfill for html2canvas to handle oklch() colors
if (typeof window !== 'undefined' && window.CSS && window.CSS.supports) {
  const origSupports = window.CSS.supports;
  window.CSS.supports = function (...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('oklch')) {
      return false;
    }
    return origSupports.apply(this, args);
  };
}

const checklistStructure = [
  {
    key: 'documentationReview',
    title: 'Pre-Visit Documentation Review',
    items: [
      'Chart Review',
      'Past Medical History reviewed',
      'Past Surgical History reviewed',
      'Allergies documented',
      'Family History documented',
      'Social History documented',
      'Medications reviewed',
      'Prior Hospitalizations documented',
      'Insurance eligibility verified in Zephyr',
      'Medical records from PCP, hospital, specialists in eCW',
      'Trucare checked for Care Management notes',
    ],
  },
  {
    key: 'visitPreparation',
    title: 'Visit Preparation (48-Hour Pre-Visit Tasks)',
    items: [
      'Patient contact attempted (3 tries if needed)',
      'Address confirmed',
      'Gate codes obtained',
      'Pet containment arranged',
      'Route mapping verified by MA',
      'Pharmacy information verified',
      'Medical supplies checked in red kit and trunk kit',
    ],
  },
  {
    key: 'documentation',
    title: 'Required Documentation and Consents',
    items: [
      'Consent to treat',
      'Release of health information consent',
      'Assignment of benefits',
      'Photography consent',
      'Telemedicine consent',
      'Home safety contract',
      'Controlled substance contract (if applicable)',
      'MPOA/OOH-DNR (if applicable)',
      'Patient Portal Authorization',
      'Prescription History Authorization',
      'Medical Group Health Information Authorization',
      'HIE Authorization',
      'Digital Communications Consent',
      'Financial Policy Notice',
      'Privacy Practices Notice',
    ],
  },
  {
    key: 'screenings',
    title: 'Required Screenings and Assessments',
    items: [
      'Edmonton Symptom Assessment (ESAS)',
      'ADLs/IADLs',
      'PHQ-2/PHQ-9 as needed',
      'Fall Risk Assessment',
      'Bladder screening',
      'Smoking screening',
      'KATZ/PPS metrics',
      'Vital signs documented in eCW',
      'Home safety assessment',
      'Medicine cabinet assessment',
      'Refrigerator Inventory',
    ],
  },
  {
    key: 'communicationSkills',
    title: 'Communication Skills',
    items: [
      'Appropriate interaction with patient/family',
      'Visit well-organized with clear agenda',
      'Uses understandable non-medical language',
      'Allows appropriate patient/family speaking time',
      'Addresses cultural/literacy barriers',
      'Comfortable completing required assessments',
      'Serious Illness Conversation completed appropriately',
      'Goals of Care reviewed for terminal patients',
      'Program contact information provided',
      'PCP contacted upon admission',
      'Appropriate use of Secure Messaging',
    ],
  },
  {
    key: 'technicalSkills',
    title: 'Technical Skills',
    items: [
      'Proper EMR usage in real-time',
      'Equipment functioning properly (computer, Grandpad, SIM card)',
      'Proper PPE and infection control',
      'Proper technique for lab draws/injections',
      'Documentation accuracy',
      'Medication refills handled appropriately',
      'Referrals submitted correctly',
      'Zephyr usage and attestations complete',
    ],
  },
  {
    key: 'knowledgeAssessment',
    title: 'Knowledge Assessment',
    items: [
      'Understands different programs',
      'Knows safe discharge procedures',
      'Demonstrates chronic disease management knowledge',
      'Understands palliation of conditions',
      'Appropriate delegation to RN/LVN/MA',
    ],
  },
  {
    key: 'postVisitTasks',
    title: 'Post-Visit Tasks',
    items: [
      'Lab specimens properly handled and delivered',
      'Action items completed',
      'Documents uploaded to EMR',
      'Program outcome communicated to PSR',
      'Notes locked within 72 business hours',
      'Care Plan Form completed',
      'Follow-up appointment scheduled (if Longitudinal)',
    ],
  },
];

// Add types for state
interface ChecklistSection {
  [item: string]: boolean;
}
interface CheckboxesState {
  [section: string]: ChecklistSection;
}
interface NotesState {
  [section: string]: string;
  overallAssessment: string;
}
interface EvalData {
  date: string;
  evaluatorName: string;
  clinicianName: string;
  notes: NotesState;
}

const initialCheckboxes: CheckboxesState = {};
const initialNotes: NotesState = {} as NotesState;
checklistStructure.forEach(section => {
  initialCheckboxes[section.key] = {};
  section.items.forEach(item => {
    initialCheckboxes[section.key][item] = false;
  });
  initialNotes[section.key] = '';
});
initialNotes['overallAssessment'] = '';

const RideAlongChecklist = () => {
  const [evalData, setEvalData] = useState<EvalData>({
    date: new Date().toISOString().split('T')[0],
    evaluatorName: '',
    clinicianName: '',
    notes: { ...initialNotes },
  });
  const [checkboxes, setCheckboxes] = useState<CheckboxesState>({ ...initialCheckboxes });
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>(
    checklistStructure.reduce((acc: { [key: string]: boolean }, section) => {
      acc[section.key] = true;
      return acc;
    }, {})
  );
  const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, completionRate: 0 });
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  useEffect(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    checklistStructure.forEach(section => {
      section.items.forEach(item => {
        totalTasks++;
        if (checkboxes[section.key][item]) completedTasks++;
      });
    });
    setStats({
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    });
  }, [checkboxes]);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rideAlongChecklist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.evalData &&
          parsed.checkboxes
        ) {
          setEvalData((prev) => ({ ...prev, ...parsed.evalData }));
          setCheckboxes((prev) => ({ ...prev, ...parsed.checkboxes }));
          console.log('Restored from localStorage:', parsed);
          // After a tick, resize all textareas to fit content
          setTimeout(() => {
            Object.keys(textareaRefs.current).forEach(key => {
              const el = textareaRefs.current[key];
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            });
          }, 0);
        }
      } catch (e) {
        console.error('Failed to restore from localStorage:', e);
      }
    }
  }, []);

  // Auto-save to localStorage every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('rideAlongChecklist', JSON.stringify({ evalData, checkboxes }));
    }, 10000);
    return () => clearInterval(interval);
  }, [evalData, checkboxes]);

  const handleCheckboxChange = (sectionKey: string, item: string) => {
    setCheckboxes(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [item]: !prev[sectionKey][item],
      },
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEvalData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotesChange = (sectionKey: string, value: string) => {
    setEvalData(prev => ({
      ...prev,
      notes: {
        ...prev.notes,
        [sectionKey]: value,
      },
    }));
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const saveTextReport = () => {
    const textContent = generateTextReport();
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RideAlong_${evalData.clinicianName || 'Evaluation'}_${evalData.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateTextReport = () => {
    let report = `HOME VISIT RIDE-ALONG EVALUATION\n`;
    report += `=================================\n\n`;
    report += `Date: ${evalData.date}\n`;
    report += `Evaluator: ${evalData.evaluatorName}\n`;
    report += `Clinician Being Evaluated: ${evalData.clinicianName}\n\n`;
    report += `Tasks Completed: ${stats.completedTasks} out of ${stats.totalTasks} (${stats.completionRate}%)\n\n`;
    checklistStructure.forEach(section => {
      report += `\n${section.title.toUpperCase()}\n`;
      report += `${'='.repeat(section.title.length)}\n\n`;
      section.items.forEach(item => {
        report += `[${checkboxes[section.key][item] ? 'X' : ' '}] ${item}\n`;
      });
      report += `\nNotes on ${section.title}:\n`;
      report += `${evalData.notes[section.key] || 'No notes provided.'}\n`;
    });
    report += `\nOVERALL ASSESSMENT\n`;
    report += `=================\n\n`;
    report += `${evalData.notes.overallAssessment || 'No overall assessment provided.'}\n`;
    return report;
  };

  const emailForm = () => {
    const textContent = generateTextReport();
    const subject = encodeURIComponent(`Ride-Along Evaluation - ${evalData.clinicianName} - ${evalData.date}`);
    const body = encodeURIComponent(textContent);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="bg-white p-4 max-w-4xl mx-auto" id="checklist-container">
      <div className="print:hidden sticky top-0 bg-white p-2 z-10 flex justify-between items-center border-b-2 border-blue-500 mb-4">
        <h1 className="text-2xl font-bold text-blue-700">Home Visit Ride-Along Evaluation</h1>
        <div className="flex space-x-2">
          <button onClick={() => window.print()} className="bg-blue-600 text-white p-2 rounded flex items-center gap-1" aria-label="Print or Save as PDF">
            <Save size={16} />
            <span className="hidden md:inline">Print / Save as PDF</span>
          </button>
          <button onClick={() => { localStorage.removeItem('rideAlongChecklist'); window.location.reload(); }} className="bg-gray-400 text-white p-2 rounded flex items-center gap-1" aria-label="Clear Saved Data">
            Clear Saved Data
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" name="date" value={evalData.date} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Evaluator Name</label>
          <input type="text" name="evaluatorName" value={evalData.evaluatorName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Enter evaluator's name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Person Being Evaluated</label>
          <input type="text" name="clinicianName" value={evalData.clinicianName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Enter person's name" />
        </div>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-700">Tasks Completed:</p>
            <p className="text-xl font-bold text-blue-700">{stats.completedTasks} of {stats.totalTasks}</p>
          </div>
          <div>
            <p className="text-sm text-gray-700">Completion Rate:</p>
            <p className="text-xl font-bold text-blue-700">{stats.completionRate}%</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${stats.completionRate}%` }}></div>
        </div>
      </div>
      {checklistStructure.map(section => (
        <div key={section.key} className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleSection(section.key)}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {expandedSections[section.key] ? <ChevronUp className="text-gray-600" size={20} /> : <ChevronDown className="text-gray-600" size={20} />}
          </div>
          {expandedSections[section.key] && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {section.items.map(item => (
                  <div key={item} className="flex items-start space-x-2">
                    <div className="cursor-pointer flex items-center mt-1" onClick={() => handleCheckboxChange(section.key, item)}>
                      {checkboxes[section.key][item] ? <CheckSquare className="text-blue-600" size={20} /> : <div className="w-5 h-5 border border-gray-400 rounded" />}
                    </div>
                    <label className="text-sm">{item}</label>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes on {section.title.toLowerCase()}...</label>
                <textarea
                  ref={el => (textareaRefs.current[section.key] = el)}
                  value={evalData.notes[section.key]}
                  onChange={e => {
                    handleNotesChange(section.key, e.target.value);
                    if (textareaRefs.current[section.key]) {
                      textareaRefs.current[section.key]!.style.height = 'auto';
                      textareaRefs.current[section.key]!.style.height = textareaRefs.current[section.key]!.scrollHeight + 'px';
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md p-2 min-h-24 resize-none"
                  placeholder={`Add notes about ${section.title.toLowerCase()}`}
                />
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">Overall Assessment</label>
        <textarea
          ref={el => (textareaRefs.current['overallAssessment'] = el)}
          value={evalData.notes.overallAssessment}
          onChange={e => {
            handleNotesChange('overallAssessment', e.target.value);
            if (textareaRefs.current['overallAssessment']) {
              textareaRefs.current['overallAssessment']!.style.height = 'auto';
              textareaRefs.current['overallAssessment']!.style.height = textareaRefs.current['overallAssessment']!.scrollHeight + 'px';
            }
          }}
          className="w-full border border-gray-300 rounded-md p-4 min-h-32 resize-none"
          placeholder="Enter your overall assessment..."
        />
      </div>
    </div>
  );
};

export default RideAlongChecklist; 