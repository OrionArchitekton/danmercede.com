import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
}

export interface Pillar {
  title: string;
  icon: LucideIcon;
  description?: string;
}

export interface Venture {
  name: string;
  role: string;
  description: string;
  ecosystemRole: string;
  systemRelationship: string;
  operatingConstraints: string;
  link?: string;
  status: string;
  logo: string;
  slug: string;
}

export interface Thought {
  title: string;
  preview: string;
  date: string;
  category: string;
}

export interface Belief {
  statement: string;
  detail: string;
}

export interface Resource {
  title: string;
  description: string;
  category: 'lead-magnet' | 'template' | 'sales-collateral' | 'diagram' | 'deck';
  fileName: string;
  filePath: string;
  enforcementLayers: number[];
  enforcementLayer: number;
  riskDomain: string;
  gated: boolean;
  enforcementPoint: string;
  artifactType: 'evidence-pack' | 'blueprint' | 'template' | 'one-sheet' | 'diagram' | 'deck';
  fileType: 'pdf' | 'docx' | 'pptx';
  fileSize: string;
}

export interface CaseStudyMetric {
  label: string;
  value: string;
}

export interface CaseStudy {
  title: string;
  slug: string;
  industry: string;
  enforcementLayers: number[];
  layerNames: string[];
  metrics: CaseStudyMetric[];
  description: string;
  fileName: string;
  filePath: string;
  enforcementPoints: string[];
  commercialMapping: string[];
}