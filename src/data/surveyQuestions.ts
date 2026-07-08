export interface SurveyQuestion {
  id: string;
  category: string;
  question: string;
}

export type SurveyFormType = "pre_event" | "evaluation";

export const RESPONSE_FORM_KEY = "__formType";
export const PRE_EVENT_RATING_KEY = "firstImpressionRating";
export const PRE_EVENT_COMMENT_KEY = "firstImpressionComment";

export const preSurveyPrompt = {
  category: "First Impression",
  question: "How would you rate your first impression of the 5th Gawad Parangal?",
  placeholder: "Optional: share a comment, expectation, or recommendation for improvement.",
};

export const surveyQuestions: SurveyQuestion[] = [
  {
    id: "q1",
    category: "Planning & Preparation",
    question: "How well was the activity planned and organized?",
  },
  {
    id: "q2",
    category: "Planning & Preparation",
    question: "Were the objectives of the activity clearly communicated?",
  },
  {
    id: "q3",
    category: "Implementation",
    question: "How effectively was the activity implemented according to the plan?",
  },
  {
    id: "q4",
    category: "Implementation",
    question: "Was the activity conducted within the target date/schedule?",
  },
  {
    id: "q5",
    category: "Participation",
    question: "How would you rate the level of participation and engagement?",
  },
  {
    id: "q6",
    category: "Participation",
    question: "Were all responsible persons actively involved?",
  },
  {
    id: "q7",
    category: "Impact & Outcome",
    question: "How would you rate the overall impact of the activity?",
  },
  {
    id: "q8",
    category: "Impact & Outcome",
    question: "Did the activity achieve its intended objectives?",
  },
  {
    id: "q9",
    category: "Resources & Support",
    question: "Were the resources and support provided adequate for the activity?",
  },
  {
    id: "q10",
    category: "Overall",
    question: "How would you rate the activity overall?",
  },
];
