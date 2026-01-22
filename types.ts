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