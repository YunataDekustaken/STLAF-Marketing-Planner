/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PostStatus = 'Not Started' | 'In Progress' | 'Ready for Review' | 'Scheduled' | 'Published';

export interface Post {
  id: string;
  date: string;
  status: PostStatus;
  contentTitle: string;
  contentType: string;
  format: string;
  topicTheme: string;
  subtopic?: string;
  funnelStatus: string;
  visualIdeas: string;
  caption?: string;
  customPrompt?: string;
  creatives?: string[];
  notes?: string;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const INITIAL_POSTS: Post[] = [
  {
    id: 'p1',
    date: '2026-04-27',
    status: 'Ready for Review',
    contentTitle: 'TOTD',
    contentType: 'Educate',
    format: 'Carousel',
    topicTheme: 'Mastering Content Strategy',
    funnelStatus: 'Awareness',
    visualIdeas: 'A 5-step process graphic showing planning to execution.',
    caption: 'Great content starts with a plan. Here is our 5-step framework for 2024.'
  },
  {
    id: 'p2',
    date: '2026-04-28',
    status: 'In Progress',
    contentTitle: 'Case Study',
    contentType: 'Inform',
    format: 'Link Post',
    topicTheme: 'Customer Success Story',
    funnelStatus: 'Consideration',
    visualIdeas: 'Client photo with a quote overlay in brand colors.',
    caption: 'See how we helped XYZ Inc achieve a 300% growth in organic traffic.'
  },
  {
    id: 'p3',
    date: '2026-04-29',
    status: 'Scheduled',
    contentTitle: 'News',
    contentType: 'Update',
    format: 'Reel',
    topicTheme: 'New Feature Launch',
    funnelStatus: 'Conversion',
    visualIdeas: 'Screen recording of the new dashboard in action.',
    caption: 'Our highly anticipated dashboard update is finally here! Check out these 3 new productivity tools.'
  },
  {
    id: 'p4',
    date: '2026-04-30',
    status: 'Not Started',
    contentTitle: 'Hiring',
    contentType: 'Brand',
    format: 'Single Image',
    topicTheme: 'Company Culture',
    funnelStatus: 'Awareness',
    visualIdeas: 'Team lunch photo, authentic and warm.',
    caption: 'We are growing! Join our talented marketing team in Manila.'
  }
];

export type ViewMode = 'admin' | 'list' | 'kanban' | 'calendar' | 'profile';

export type UserRole = 'marketing_supervisor' | 'marketing_member' | 'department';

export type Department = 'Sales' | 'Marketing' | 'HR' | 'IT' | 'Finance' | 'Operations' | 'Corporate';

export type UserStatus = 'active' | 'pending' | 'blocked';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: Department;
  photoURL?: string;
  status: UserStatus;
}
