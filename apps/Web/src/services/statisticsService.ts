import { supabase } from '../lib/supabaseClient';
import { EventService } from './eventService';
import { SurveyService } from './surveyService';

export interface EventWithSurvey {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  venue: string;
  status: string;
  survey: {
    id: string;
    title: string;
    description?: string;
    questions: any[];
  };
  responseCount: number;
}

export interface QuestionStatistics {
  questionId: string;
  questionText: string;
  questionType: string;
  totalResponses: number;
  answerDistribution: {
    [key: string]: number;
  };
  averageRating?: number;
  responses: any[];
}

export interface EventStatistics {
  event: any;
  survey: any;
  totalResponses: number;
  responseRate: number;
  questionStats: QuestionStatistics[];
  participantCount: number;
  registrationCount: number;
  satisfactionRate?: number;
}

export class StatisticsService {
  /**
   * Get all events with their evaluation forms (surveys)
   */
  static async getEventsWithSurveys(): Promise<{ events?: EventWithSurvey[]; error?: string }> {
    try {
      // Get all surveys
      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('id, title, description, event_id, questions, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (surveysError) {
        return { error: surveysError.message };
      }

      if (!surveys || surveys.length === 0) {
        return { events: [] };
      }

      // Get unique event IDs
      const eventIds = [...new Set(surveys.map(s => s.event_id))];

      // Get events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .order('start_date', { ascending: false });

      if (eventsError) {
        return { error: eventsError.message };
      }

      // Get response counts for each survey
      const surveyIds = surveys.map(s => s.id);
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .in('survey_id', surveyIds);

      if (responsesError) {
        console.error('Error fetching response counts:', responsesError);
      }

      // Count responses per survey
      const responseCounts: { [key: string]: number } = {};
      if (responses) {
        responses.forEach(r => {
          responseCounts[r.survey_id] = (responseCounts[r.survey_id] || 0) + 1;
        });
      }

      // Combine events with their surveys
      const eventsWithSurveys: EventWithSurvey[] = events
        .map(event => {
          const eventSurvey = surveys.find(s => s.event_id === event.id);
          if (!eventSurvey) return null;

          return {
            ...event,
            survey: {
              id: eventSurvey.id,
              title: eventSurvey.title,
              description: eventSurvey.description,
              questions: eventSurvey.questions || []
            },
            responseCount: responseCounts[eventSurvey.id] || 0
          };
        })
        .filter(Boolean) as EventWithSurvey[];

      return { events: eventsWithSurveys };
    } catch (error) {
      console.error('Error in getEventsWithSurveys:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get detailed statistics for a specific event
   */
  static async getEventStatistics(eventId: string): Promise<{ stats?: EventStatistics; error?: string }> {
    try {
      // Get event
      const eventResult = await EventService.getEventById(eventId);
      if (eventResult.error || !eventResult.event) {
        return { error: eventResult.error || 'Event not found' };
      }

      // Get survey for this event
      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (surveysError) {
        return { error: surveysError.message };
      }

      if (!surveys || surveys.length === 0) {
        return { error: 'No active survey found for this event' };
      }

      const survey = surveys[0];

      // Get all responses for this survey
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', survey.id)
        .order('created_at', { ascending: false });

      if (responsesError) {
        return { error: responsesError.message };
      }

      const totalResponses = responses?.length || 0;

      // Get registration count
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId);

      const registrationCount = registrations?.length || 0;
      const responseRate = registrationCount > 0 
        ? (totalResponses / registrationCount) * 100 
        : 0;

      // Process question statistics
      const questionStats: QuestionStatistics[] = [];
      const questions = survey.questions || [];

      questions.forEach((question, index) => {
        const questionId = question.id || question.question || `q_${index}`;
        const questionText = question.question || question.questionText || '';
        const questionType = question.type || question.questionType || 'text';

        const questionResponses = responses
          ?.map(r => r.responses?.[questionId])
          .filter(r => r !== undefined && r !== null && r !== '') || [];

        const stats: QuestionStatistics = {
          questionId,
          questionText,
          questionType,
          totalResponses: questionResponses.length,
          answerDistribution: {},
          responses: questionResponses
        };

        // Process based on question type
        if (questionType === 'multiple-choice' || questionType === 'multiple_choice' || questionType === 'dropdown') {
          // Count each option
          questionResponses.forEach(response => {
            const answer = String(response);
            stats.answerDistribution[answer] = (stats.answerDistribution[answer] || 0) + 1;
          });
        } else if (questionType === 'checkbox') {
          // For checkboxes, count each selected option
          questionResponses.forEach(response => {
            if (Array.isArray(response)) {
              response.forEach(option => {
                stats.answerDistribution[option] = (stats.answerDistribution[option] || 0) + 1;
              });
            }
          });
        } else if (questionType === 'linear-scale' || questionType === 'rating' || questionType === 'star-rating') {
          // Calculate average and distribution for ratings
          const numericResponses = questionResponses
            .map(r => parseFloat(String(r)))
            .filter(r => !isNaN(r));

          if (numericResponses.length > 0) {
            stats.averageRating = numericResponses.reduce((a, b) => a + b, 0) / numericResponses.length;
            
            // Distribution
            numericResponses.forEach(rating => {
              const key = String(Math.round(rating));
              stats.answerDistribution[key] = (stats.answerDistribution[key] || 0) + 1;
            });
          }
        } else {
          // For text/paragraph, just count responses
          questionResponses.forEach(response => {
            const answer = String(response).substring(0, 50); // Truncate for grouping
            stats.answerDistribution[answer] = (stats.answerDistribution[answer] || 0) + 1;
          });
        }

        questionStats.push(stats);
      });

      // Calculate satisfaction rate (if there are rating questions)
      const ratingQuestions = questionStats.filter(q => 
        q.questionType === 'linear-scale' || 
        q.questionType === 'rating' || 
        q.questionType === 'star-rating'
      );

      let satisfactionRate: number | undefined;
      if (ratingQuestions.length > 0) {
        const allRatings = ratingQuestions
          .flatMap(q => q.responses.map(r => parseFloat(String(r))))
          .filter(r => !isNaN(r));

        if (allRatings.length > 0) {
          const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
          // Assuming 5-point scale, convert to percentage
          const maxRating = 5; // Could be dynamic based on question config
          satisfactionRate = (avgRating / maxRating) * 100;
        }
      }

      // Get participant count (from attendance or registrations)
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_validated', true);

      const participantCount = attendance?.length || registrationCount;

      return {
        stats: {
          event: eventResult.event,
          survey,
          totalResponses,
          responseRate,
          questionStats,
          participantCount,
          registrationCount,
          satisfactionRate
        }
      };
    } catch (error) {
      console.error('Error in getEventStatistics:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  /**
   * Export statistics data as JSON
   */
  static exportAsJSON(data: any, filename: string) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export statistics data as CSV
   */
  static exportAsCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
      // Create empty CSV with headers if we have at least one item structure
      if (data && data.length === 0) {
        const emptyBlob = new Blob(['No data available'], { type: 'text/csv' });
        const url = URL.createObjectURL(emptyBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert('No data to export');
      }
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => {
        // Handle values that might contain commas or quotes
        const str = String(val || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

