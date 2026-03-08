export interface Question {
  id: string;
  question: string;
  options?: string[];
  correct?: string;
  answer?: string;
  keywords?: string[];
  explanation?: string;
}

export interface QuizData {
  title: string;
  questions: Question[];
}
