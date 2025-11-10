import React, { useState } from 'react';
import { Bell, Calendar, ChevronDown, Book, Brain, FileText, Search, ArrowRight, Play, Image, Headphones, Users, User } from 'lucide-react';
import './styles.css';
import SimplifiedClinicalSkillsPage from './ClinicalSkillsPage';

// Type definitions
interface Course {
  id: number;
  name: string;
  progress: number;
  nextTopic: string;
  upcomingExam: string;
}

interface Topic {
  id: number;
  name: string;
  recentlyStudied?: boolean;
}

interface UpcomingExam {
  date: string;
  name: string;
  topics: string[];
}

interface ConceptMap {
  nodes: {
    id: number;
    name: string;
    mastery: number;
  }[];
}

interface Source {
  id: number;
  name: string;
  type: 'textbook' | 'slides' | 'syllabus';
  pages?: string;
  date?: string;
}

// Component props interfaces
interface HomePageProps {
  onCourseSelect: (course: Course) => void;
  onClinicalSkillsSelect: () => void;
}

interface CoursePageProps {
  course: Course;
  onTopicSelect: (topic: Topic) => void;
  onBackClick: () => void;
}

interface LearnPageProps {
  course: Course;
  topic: Topic;
  onBackClick: () => void;
}

const GyanApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'course' | 'learn' | 'clinicalSkills'>('home');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [latestPatientRecording, setLatestPatientRecording] = useState<Blob | null>(null);
  
  const handleCourseSelect = (course: Course): void => {
    setActiveCourse(course);
    setCurrentPage('course');
  };
  
  const handleTopicSelect = (topic: Topic): void => {
    setCurrentTopic(topic);
    setCurrentPage('learn');
  };
  
  const handleClinicalSkillsSelect = (): void => {
    setCurrentPage('clinicalSkills');
  };
  
  const handleBackToCourses = (): void => {
    setCurrentPage('home');
  };
  
  const handleBackToCourse = (): void => {
    setCurrentPage('course');
  };
  
  const handleRecordingComplete = (recording: Blob): void => {
    setLatestPatientRecording(recording);
    console.log('Latest recording received in GyanApp', recording);
  };
  
  return (
    <div className="gyan-app">
      <Header />
      
      {currentPage === 'home' && (
        <HomePage 
          onCourseSelect={handleCourseSelect}
          onClinicalSkillsSelect={handleClinicalSkillsSelect}
        />
      )}
      
      {currentPage === 'course' && activeCourse && (
        <CoursePage 
          course={activeCourse} 
          onTopicSelect={handleTopicSelect}
          onBackClick={handleBackToCourses}
        />
      )}
      
      {currentPage === 'learn' && currentTopic && activeCourse && (
        <LearnPage 
          course={activeCourse}
          topic={currentTopic}
          onBackClick={handleBackToCourse}
        />
      )}
      
      {currentPage === 'clinicalSkills' && (
        <SimplifiedClinicalSkillsPage 
          onBackClick={handleBackToCourses}
          onRecordingComplete={handleRecordingComplete}
        />
      )}
      
      <Footer />
    </div>
  );
};

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="logo-container">
            <div className="logo">
              <span className="logo-text">Gyan</span>
            </div>
          </div>
          
          <div className="search-container">
            <div className="search-wrapper">
              <div className="search-icon-wrapper">
                <Search className="search-icon" />
              </div>
              <input
                type="text"
                className="search-input"
                placeholder="Search for concepts, topics..."
              />
            </div>
          </div>
          
          <div className="user-controls">
            <button className="notification-button">
              <Bell className="notification-icon" />
            </button>
            <div className="user-profile">
              <button className="user-profile-button">
                <div className="user-avatar">
                  <User className="user-avatar-icon" />
                </div>
                <ChevronDown className="dropdown-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const HomePage: React.FC<HomePageProps> = ({ onCourseSelect, onClinicalSkillsSelect }) => {
  const courses: Course[] = [
    { id: 1, name: 'Pathology II', progress: 68, nextTopic: 'Pneumonia', upcomingExam: 'Midterm on March 5th' },
    { id: 2, name: 'Anatomy', progress: 42, nextTopic: 'Cardiovascular System', upcomingExam: 'Quiz on March 1st' },
    { id: 3, name: 'Pharmacology', progress: 21, nextTopic: 'Antibiotics', upcomingExam: 'None' },
  ];

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return (
    <main className="main-container">
      <div className="dashboard-grid">
        {/* Today's Dashboard - Left Column */}
        <div className="today-dashboard">
          <div className="dashboard-panel">
            <div className="dashboard-header">
              <div>
                <h2 className="dashboard-title">Today</h2>
                <p className="dashboard-date">{formattedDate}</p>
              </div>
              <button className="view-all-button">
                View all courses
              </button>
            </div>
            
            <div className="course-list">
              {courses.map(course => (
                <div 
                  key={course.id}
                  className="course-card"
                  onClick={() => onCourseSelect(course)}
                >
                  <div className="course-header">
                    <h3 className="course-title">{course.name}</h3>
                    <span className="course-progress-text">Progress: {course.progress}%</span>
                  </div>
                  
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="course-details">
                    <div>
                      <span className="detail-label">Next topic:</span> {course.nextTopic}
                    </div>
                    <div>
                      <span className="detail-label">Upcoming:</span> {course.upcomingExam}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Professional Learning - Right Column */}
        <div className="side-panel">
          <div className="panel-section">
            <div className="panel-content">
              <h2 className="panel-title">Professional Learning</h2>
              
              <div className="learning-options">
                <div className="learning-option" onClick={onClinicalSkillsSelect}>
                  <div className="option-icon-wrapper">
                    <Book className="option-icon" />
                  </div>
                  <div>
                    <h3 className="option-title">Clinical Skills</h3>
                    <p className="option-description">Begin foundational training</p>
                  </div>
                </div>
                
                <div className="learning-option">
                  <div className="option-icon-wrapper">
                    <Brain className="option-icon" />
                  </div>
                  <div>
                    <h3 className="option-title">Research Methods</h3>
                    <p className="option-description">Introduction to medical research</p>
                  </div>
                </div>
                
                <div className="learning-option">
                  <div className="option-icon-wrapper">
                    <Users className="option-icon" />
                  </div>
                  <div>
                    <h3 className="option-title">Patient Communication</h3>
                    <p className="option-description">Effective doctor-patient dialogue</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="panel-section">
            <div className="panel-content">
              <h2 className="panel-title">Notifications</h2>
              
              <div className="notification-list">
                <div className="notification-item">
                  <p className="notification-text">Your next Pathology II quiz is in 3 days. We recommend reviewing Pneumonia concepts.</p>
                  <div className="notification-action">
                    <button className="notification-button-link">Start Review</button>
                  </div>
                </div>
                
                <div className="notification-item">
                  <p className="notification-text">You've been spending more time on case simulations. How are they helping you?</p>
                  <div className="notification-action">
                    <button className="notification-button-link">Share Feedback</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const CoursePage: React.FC<CoursePageProps> = ({ course, onTopicSelect, onBackClick }) => {
  const todaysTopic: Topic = { id: 1, name: 'Pneumonia', recentlyStudied: true };
  
  return (
    <main className="main-container">
      <button 
        onClick={onBackClick}
        className="back-button"
      >
        <ChevronDown className="back-icon" />
        Back to all courses
      </button>
      
      <div className="course-header-section">
        <h1 className="course-header-title">{course.name}</h1>
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${course.progress}%` }}
          ></div>
        </div>
        <p className="progress-text">Overall progress: {course.progress}%</p>
      </div>
      
      <div className="course-content-grid">
        {/* Learn Section */}
        <div className="learn-section">
          <h2 className="section-title">Learn</h2>
          
          <div className="todays-topic">
            <div className="topic-badge-row">
              <div className="topic-badge">
                !
              </div>
              <h3 className="topic-badge-title">Today's Topic</h3>
            </div>
            <p className="topic-name">{todaysTopic.name}</p>
            <p className="topic-description">
              This topic was covered in your class today. It's recommended to review while it's fresh.
            </p>
            <button 
              className="primary-button"
              onClick={() => onTopicSelect(todaysTopic)}
            >
              Start Learning
            </button>
          </div>
          
          <button className="secondary-button">
            Choose Another Topic
          </button>
        </div>
        
        {/* Review Section */}
        <div className="review-section">
          <div className="review-panel">
            <h2 className="section-title">Review</h2>
            
            <div className="review-content">
              <div className="exam-notification">
                <h3 className="notification-title">Upcoming Exam</h3>
                <p className="exam-info">Midterm Exam on March 5th, 2025</p>
                <div className="topic-tags">
                  {['Pneumonia', 'Tuberculosis', 'Lung Cancer', 'COPD'].map((topic, index) => (
                    <span 
                      key={index} 
                      className="topic-tag"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <button className="link-button">
                  Prepare for Exam
                  <ArrowRight className="link-icon" />
                </button>
              </div>
              
              <div className="concept-map-section">
                <h3 className="notification-title">Concept Map</h3>
                <p className="concept-description">
                  An Obsidian-style network of related concepts
                </p>
                <div className="concept-map-placeholder">
                  <p className="placeholder-text">Interactive concept map visualization</p>
                </div>
                <button className="link-button">
                  Explore Full Map
                  <ArrowRight className="link-icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const LearnPage: React.FC<LearnPageProps> = ({ course, topic, onBackClick }) => {
  type ContentFormat = 'text' | 'video' | 'image' | 'audio';
  
  const [contentFormat, setContentFormat] = useState<ContentFormat>('text');
  const [showSources, setShowSources] = useState<boolean>(false);
  
  return (
    <main className="main-container">
      <button 
        onClick={onBackClick}
        className="back-button"
      >
        <ChevronDown className="back-icon" />
        Back to {course.name}
      </button>
      
      <div className="learn-page-header">
        <h1 className="learn-page-title">{course.name}: {topic.name}</h1>
      </div>
      
      <div className="content-panel">
        <div className="content-panel-inner">
          <div className="content-panel-header">
            <div className="content-title-section">
              <button 
                className={`source-toggle-button ${showSources ? 'source-toggle-active' : ''}`}
                onClick={() => setShowSources(!showSources)}
              >
                <FileText className="source-icon" />
              </button>
              <h2 className="content-title">{showSources ? 'Sources' : 'Learn: ' + topic.name}</h2>
            </div>
            
            <div className="format-selector">
              <button 
                className={`format-button ${contentFormat === 'text' ? 'format-active' : ''}`}
                onClick={() => setContentFormat('text')}
              >
                <FileText className="format-icon" />
              </button>
              <button 
                className={`format-button ${contentFormat === 'video' ? 'format-active' : ''}`}
                onClick={() => setContentFormat('video')}
              >
                <Play className="format-icon" />
              </button>
              <button 
                className={`format-button ${contentFormat === 'image' ? 'format-active' : ''}`}
                onClick={() => setContentFormat('image')}
              >
                <Image className="format-icon" />
              </button>
              <button 
                className={`format-button ${contentFormat === 'audio' ? 'format-active' : ''}`}
                onClick={() => setContentFormat('audio')}
              >
                <Headphones className="format-icon" />
              </button>
            </div>
          </div>
          
          {/* Sources Section */}
          {showSources && (
            <div className="sources-section">
              <h3 className="sources-title">Content Sources</h3>
              <div className="source-list">
                {[
                  { id: 1, name: 'Robbins & Cotran Pathologic Basis of Disease', type: 'textbook', pages: '721-734' },
                  { id: 2, name: 'Professor Smith\'s Lecture Slides', type: 'slides', date: 'Feb 27, 2025' },
                  { id: 3, name: 'Course Syllabus', type: 'syllabus' }
                ].map(source => (
                  <div key={source.id} className="source-item">
                    <div className="source-info">
                      <div>
                        <p className="source-name">{source.name}</p>
                        <p className="source-details">
                          {source.type === 'textbook' ? `Pages: ${source.pages}` : 
                           source.type === 'slides' ? `Date: ${source.date}` : 
                           'Referenced in course materials'}
                        </p>
                      </div>
                      <div>
                        <span className="source-type">
                          {source.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Main Content Section */}
          {!showSources && (
            <div className="learning-content">
              {contentFormat === 'text' && (
                <div className="text-content">
                  <h3 className="content-section-title">Summary</h3>
                  <div className="prose-content">
                    <p>
                      Pneumonia is an inflammatory condition of the lung primarily affecting the small air sacs known as alveoli. 
                      It is typically caused by infection with viruses or bacteria, and less commonly by other microorganisms.
                    </p>
                    <h4>Key Characteristics:</h4>
                    <ul>
                      <li>Inflammation of the alveoli, which become filled with fluid</li>
                      <li>Can be classified by causative agent, location, or pattern</li>
                      <li>Common symptoms include cough, chest pain, fever, and difficulty breathing</li>
                    </ul>
                    <h4>Pathophysiology:</h4>
                    <p>
                      The typical pathophysiological process involves several stages:
                    </p>
                    <ol>
                      <li><strong>Congestion</strong>: Vascular engorgement, intra-alveolar fluid with bacteria, and few neutrophils</li>
                      <li><strong>Red Hepatization</strong>: Alveoli filled with erythrocytes, neutrophils,and fibrin</li>
                      <li><strong>Gray Hepatization</strong>: Continuing neutrophil migration with progressive fibrin deposition</li>
                      <li><strong>Resolution</strong>: Breakdown of fibrin and removal of cellular debris by macrophages</li>
                    </ol>
                  </div>
                </div>
              )}
              
              {contentFormat === 'video' && (
                <div className="video-content">
                  <h3 className="content-section-title">Video Explanation</h3>
                  <div className="video-container">
                    <Play className="video-play-icon" />
                    <div className="video-overlay"></div>
                    <p className="placeholder-text">Interactive video content for Pneumonia</p>
                  </div>
                </div>
              )}
              
              {contentFormat === 'image' && (
                <div className="image-content">
                  <h3 className="content-section-title">Visual Representation</h3>
                  <div className="image-grid">
                    <div className="image-container">
                      <p className="image-label">X-Ray Image</p>
                      <div className="image-placeholder">
                        <p className="placeholder-text">Interactive X-ray with annotations</p>
                      </div>
                    </div>
                    <div className="image-container">
                      <p className="image-label">Histopathology</p>
                      <div className="image-placeholder">
                        <p className="placeholder-text">Interactive microscopic view</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {contentFormat === 'audio' && (
                <div className="audio-content">
                  <h3 className="content-section-title">Audio Lecture</h3>
                  <div className="audio-player">
                    <div className="audio-player-header">
                      <div>
                        <p className="audio-title">Pneumonia Pathophysiology</p>
                        <p className="audio-source">Generated from your course materials</p>
                      </div>
                      <button className="audio-play-button">
                        <Play className="audio-play-icon" />
                      </button>
                    </div>
                    <div className="audio-progress-bar-bg">
                      <div className="audio-progress-bar-fill"></div>
                    </div>
                    <div className="audio-time">
                      <span>4:12</span>
                      <span>12:45</span>
                    </div>
                  </div>
                  <p className="audio-description">
                    This audio format allows you to learn while on the go. The content is derived from your course materials and delivered in a conversational format.
                  </p>
                </div>
              )}
              
              <div className="continue-section">
                <button className="continue-button">
                  Continue to Post-Learning Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="copyright">
            © 2025 Gyan. All rights reserved.
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Help & Support</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GyanApp;