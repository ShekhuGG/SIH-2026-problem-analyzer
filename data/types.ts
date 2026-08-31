export type ApproachDetails = {
  coreApproach: string;
  mainTechnologies: string;
  keyAlgorithm: string;
  technicalChallenge: string;
  mvp: string;
};

export type Problem = {
  id: string;
  problemStatementId: string;
  title: string;
  statement: string;
  organization: string;
  department: string;
  category: string;
  theme: string;
  sourceUrl: string;
  datasetUrl: string;
  youtubeUrl: string;
  keywords: string[];
  tags: Record<string, number>;
  importance: number;
  approach: {
    summary: string;
    flow: string[];
    details: ApproachDetails;
  };
};

export type Dataset = {
  name: string;
  sourceUrl: string;
  tags: string[];
  metrics: ['Importance'];
  problems: Problem[];
};
