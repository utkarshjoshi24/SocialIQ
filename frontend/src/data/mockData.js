/**
 * Realistic Mock Data for SocialIQ
 * Matches the Stitch screens and the Data Dictionary specifications.
 */

// Overview KPIs
export const mockOverviewKpis = [
  {
    label: 'TOTAL POSTS',
    value: '148',
    delta: '+12.1%',
    isPositive: true,
    icon: 'layers',
  },
  {
    label: 'TOTAL VIEWS',
    value: '2.84M',
    delta: '+18.4%',
    isPositive: true,
    icon: 'visibility',
  },
  {
    label: 'TOTAL LIKES',
    value: '194.2K',
    delta: '+9.7%',
    isPositive: true,
    icon: 'favorite',
  },
  {
    label: 'ENGAGEMENT RATE',
    value: '6.84%',
    delta: '+1.2%',
    isPositive: true,
    icon: 'bolt',
  },
];

// 27-day Trajectory Data for Performance Overview Chart
export const mockTimeSeriesData = [
  { date: 'Nov 1', views: 42000, reach: 35000, engagement: 5.4 },
  { date: 'Nov 3', views: 48000, reach: 41000, engagement: 5.8 },
  { date: 'Nov 5', views: 65000, reach: 52000, engagement: 6.2 },
  { date: 'Nov 7', views: 58000, reach: 49000, engagement: 5.9 },
  { date: 'Nov 9', views: 72000, reach: 61000, engagement: 6.5 },
  { date: 'Nov 11', views: 88000, reach: 74000, engagement: 6.8 },
  { date: 'Nov 13', views: 81000, reach: 70000, engagement: 6.4 },
  { date: 'Nov 15', views: 95000, reach: 82000, engagement: 7.1 },
  { date: 'Nov 17', views: 110000, reach: 94000, engagement: 7.5 },
  { date: 'Nov 19', views: 104000, reach: 89000, engagement: 7.2 },
  { date: 'Nov 21', views: 142800, reach: 118400, engagement: 7.9 },
  { date: 'Nov 23', views: 135000, reach: 112000, engagement: 7.6 },
  { date: 'Nov 25', views: 148000, reach: 124000, engagement: 8.1 },
  { date: 'Nov 27', views: 162000, reach: 138000, engagement: 8.4 },
];

// Content Format Performance
export const mockFormatPerformance = [
  { format: 'Reels', avgViews: '34.2K avg', percentage: 88, color: 'bg-primary', textColor: 'text-primary' },
  { format: 'Carousels', avgViews: '26.8K avg', percentage: 69, color: 'bg-secondary', textColor: 'text-secondary' },
  { format: 'Videos', avgViews: '21.4K avg', percentage: 55, color: 'bg-text-secondary', textColor: 'text-text-secondary' },
  { format: 'Images', avgViews: '14.1K avg', percentage: 36, color: 'bg-outline', textColor: 'text-text-muted' },
];

// Top Performing Posts
export const mockTopPosts = [
  {
    id: 'P142',
    title: 'Kyoto Morning Light — 48h Reel',
    type: 'Reel',
    category: 'Travel',
    views: '412.6K',
    er: '8.4%',
    tier: 'High',
    icon: 'play_circle',
    iconColor: 'text-primary',
  },
  {
    id: 'P138',
    title: 'My Desk Setup for 2026 Creators',
    type: 'Carousel',
    category: 'Tech',
    views: '298.4K',
    er: '7.9%',
    tier: 'High',
    icon: 'view_carousel',
    iconColor: 'text-secondary',
  },
  {
    id: 'P129',
    title: '3 Editing Cuts That Hold Retention',
    type: 'Reel',
    category: 'Education',
    views: '241.0K',
    er: '7.2%',
    tier: 'High',
    icon: 'play_circle',
    iconColor: 'text-primary',
  },
  {
    id: 'P114',
    title: 'Campus Hackathon Recap Film',
    type: 'Video',
    category: 'Community',
    views: '164.5K',
    er: '5.1%',
    tier: 'Medium',
    icon: 'videocam',
    iconColor: 'text-text-secondary',
  },
];

// Quick Insights for Overview
export const mockQuickInsights = [
  {
    tag: 'Content Format',
    tagColor: 'text-primary',
    dotColor: 'bg-primary',
    text: 'Reels outperform images by 42% in average reach.',
    highlight: '42%',
  },
  {
    tag: 'Posting Window',
    tagColor: 'text-secondary',
    dotColor: 'bg-secondary',
    text: 'Evening posts (7 PM – 9 PM) generate the highest engagement.',
    highlight: '7 PM – 9 PM',
  },
  {
    tag: 'Category Lead',
    tagColor: 'text-success',
    dotColor: 'bg-success',
    text: 'Travel content currently has the strongest reach across all channels.',
    highlight: 'Travel',
  },
];

// Posts Screen Master Dataset
export const mockPosts = [
  {
    id: 'P148',
    title: 'Kyoto Morning Light — 48h Reel',
    platform: 'Instagram',
    content_type: 'Reel',
    category: 'Travel',
    date: '2026-11-26',
    views: 412600,
    likes: 34800,
    comments: 1420,
    shares: 4100,
    saves: 8900,
    engagement_rate: 8.4,
    tier: 'High',
    icon: 'play_circle',
    iconColor: 'text-primary',
  },
  {
    id: 'P147',
    title: 'My Desk Setup for 2026 Creators',
    platform: 'Instagram',
    content_type: 'Carousel',
    category: 'Tech',
    date: '2026-11-24',
    views: 298400,
    likes: 23600,
    comments: 980,
    shares: 2800,
    saves: 6400,
    engagement_rate: 7.9,
    tier: 'High',
    icon: 'view_carousel',
    iconColor: 'text-secondary',
  },
  {
    id: 'P146',
    title: '3 Editing Cuts That Hold Retention',
    platform: 'YouTube',
    content_type: 'Reel',
    category: 'Education',
    date: '2026-11-22',
    views: 241000,
    likes: 17400,
    comments: 860,
    shares: 2100,
    saves: 5200,
    engagement_rate: 7.2,
    tier: 'High',
    icon: 'play_circle',
    iconColor: 'text-primary',
  },
  {
    id: 'P145',
    title: 'Campus Hackathon Recap Film',
    platform: 'YouTube',
    content_type: 'Video',
    category: 'Community',
    date: '2026-11-20',
    views: 164500,
    likes: 8400,
    comments: 420,
    shares: 950,
    saves: 1800,
    engagement_rate: 5.1,
    tier: 'Medium',
    icon: 'videocam',
    iconColor: 'text-text-secondary',
  },
  {
    id: 'P144',
    title: 'Autumn Color Grading LUT Breakdown',
    platform: 'Instagram',
    content_type: 'Carousel',
    category: 'Education',
    date: '2026-11-18',
    views: 142000,
    likes: 9800,
    comments: 510,
    shares: 1400,
    saves: 3600,
    engagement_rate: 6.8,
    tier: 'High',
    icon: 'view_carousel',
    iconColor: 'text-secondary',
  },
  {
    id: 'P143',
    title: 'Why I Switched to Monospace Layouts',
    platform: 'LinkedIn',
    content_type: 'Image',
    category: 'Tech',
    date: '2026-11-16',
    views: 89400,
    likes: 3800,
    comments: 290,
    shares: 480,
    saves: 910,
    engagement_rate: 4.6,
    tier: 'Medium',
    icon: 'image',
    iconColor: 'text-text-secondary',
  },
  {
    id: 'P142',
    title: 'Weekly Production Workflow Vlog',
    platform: 'YouTube',
    content_type: 'Video',
    category: 'Lifestyle',
    date: '2026-11-14',
    views: 74200,
    likes: 2900,
    comments: 180,
    shares: 210,
    saves: 440,
    engagement_rate: 3.2,
    tier: 'Low',
    icon: 'videocam',
    iconColor: 'text-text-secondary',
  },
];

// Descriptive Statistics (Analytics Screen)
export const mockDescriptiveStats = [
  { metric: 'Views', mean: '19,189.2', median: '14,200.0', std: '16,420.5', min: '1,200', max: '412,600' },
  { metric: 'Likes', mean: '1,312.4', median: '890.0', std: '1,240.1', min: '45', max: '34,800' },
  { metric: 'Comments', mean: '84.6', median: '48.0', std: '92.3', min: '2', max: '1,420' },
  { metric: 'Shares', mean: '142.1', median: '86.0', std: '168.4', min: '0', max: '4,100' },
  { metric: 'Saves', mean: '284.5', median: '164.0', std: '340.2', min: '6', max: '8,900' },
  { metric: 'Reach', mean: '15,640.8', median: '11,400.0', std: '13,890.0', min: '980', max: '350,000' },
  { metric: 'Eng. Rate', mean: '6.84%', median: '6.40%', std: '2.14%', min: '1.20%', max: '14.80%' },
];

// Content Analysis (Analytics Screen)
export const mockContentAnalysis = [
  { format: 'Reels', avgEng: '8.4%', count: 54, width: '84%' },
  { format: 'Carousels', avgEng: '6.9%', count: 42, width: '69%' },
  { format: 'Videos', avgEng: '5.2%', count: 32, width: '52%' },
  { format: 'Images', avgEng: '3.8%', count: 20, width: '38%' },
];

// Category Analysis (Analytics Screen)
export const mockCategoryAnalysis = [
  { category: 'Travel', avgViews: '38.4K', eng: '7.8%', width: '92%' },
  { category: 'Tech', avgViews: '29.2K', eng: '7.1%', width: '74%' },
  { category: 'Education', avgViews: '24.6K', eng: '6.5%', width: '62%' },
  { category: 'Community', avgViews: '18.1K', eng: '5.4%', width: '48%' },
  { category: 'Lifestyle', avgViews: '12.4K', eng: '4.2%', width: '34%' },
];

// Day of Week Distribution
export const mockDayAnalysis = [
  { day: 'Mon', count: 18, height: '48%' },
  { day: 'Tue', count: 24, height: '62%' },
  { day: 'Wed', count: 28, height: '74%' },
  { day: 'Thu', count: 34, height: '88%' },
  { day: 'Fri', count: 42, height: '100%', isPeak: true },
  { day: 'Sat', count: 22, height: '58%' },
  { day: 'Sun', count: 16, height: '42%' },
];

// Pearson Correlation Matrix
export const mockCorrelationMatrix = [
  { metric: 'Views', views: '1.00', likes: '0.92', comments: '0.84', shares: '0.88', saves: '0.79', reach: '0.98', er: '0.34' },
  { metric: 'Likes', views: '0.92', likes: '1.00', comments: '0.89', shares: '0.84', saves: '0.82', reach: '0.91', er: '0.48' },
  { metric: 'Comments', views: '0.84', likes: '0.89', comments: '1.00', shares: '0.78', saves: '0.76', reach: '0.83', er: '0.52' },
  { metric: 'Shares', views: '0.88', likes: '0.84', comments: '0.78', shares: '1.00', saves: '0.85', reach: '0.87', er: '0.61' },
  { metric: 'Saves', views: '0.79', likes: '0.82', comments: '0.76', shares: '0.85', saves: '1.00', reach: '0.80', er: '0.74' },
  { metric: 'Reach', views: '0.98', likes: '0.91', comments: '0.83', shares: '0.87', saves: '0.80', reach: '1.00', er: '0.28' },
  { metric: 'Eng. Rate', views: '0.34', likes: '0.48', comments: '0.52', shares: '0.61', saves: '0.74', reach: '0.28', er: '1.00' },
];

// Insights Screen Master Dataset
export const mockInsights = [
  {
    id: 1,
    category: 'Performance',
    title: 'Reels generate the highest average views.',
    description: 'Short-form vertical video (15s–45s) outperforms all other formats in algorithmic distribution, delivering +42% more reach than static images.',
    metric: '+42% Views',
    badge: 'High Impact',
    badgeColor: 'bg-primary-container text-on-primary-container border-primary/20',
    dotColor: 'bg-primary',
  },
  {
    id: 2,
    category: 'Timing',
    title: 'Peak engagement occurs between 7 PM – 9 PM.',
    description: 'Publishing during evening wind-down hours yields 2.4× higher comment and share volume compared to morning posts (8 AM – 11 AM).',
    metric: '2.4× Engagement',
    badge: 'Timing Lead',
    badgeColor: 'bg-secondary-container text-on-secondary-container border-secondary/20',
    dotColor: 'bg-secondary',
  },
  {
    id: 3,
    category: 'Category',
    title: 'Travel content consistently retains viewers.',
    description: 'Travel and exploration narratives hold an average completion rate of 68%, making it your highest converting thematic category.',
    metric: '68% Retention',
    badge: 'Category Lead',
    badgeColor: 'bg-success-container text-on-success-container border-success/20',
    dotColor: 'bg-success',
  },
  {
    id: 4,
    category: 'Engagement',
    title: 'Saves strongly predict overall viral distribution.',
    description: 'Pearson correlation between bookmark saves and 7-day algorithmic reach is r = 0.85, confirming utility-driven content drives repeat impressions.',
    metric: 'r = 0.85 Correlation',
    badge: 'Core Signal',
    badgeColor: 'bg-primary-container text-on-primary-container border-primary/20',
    dotColor: 'bg-primary',
  },
  {
    id: 5,
    category: 'Content',
    title: '22s – 38s duration sweet spot for Reels.',
    description: 'Videos under 15 seconds often fail to build narrative depth, while videos over 50 seconds drop viewer retention by 44% before the final call-to-action.',
    metric: '22s–38s Optimal',
    badge: 'Format Rule',
    badgeColor: 'bg-secondary-container text-on-secondary-container border-secondary/20',
    dotColor: 'bg-secondary',
  },
  {
    id: 6,
    category: 'Content',
    title: '4 to 7 focused hashtags outperform broad tags.',
    description: 'Niche, specific hashtags drive +28% higher discovery than generic high-volume tags like #viral or #trending, which decay rapidly in feed rankings.',
    metric: '+28% Discovery',
    badge: 'Optimization',
    badgeColor: 'bg-warning-container text-on-warning-container border-warning/20',
    dotColor: 'bg-warning',
  },
];

// Compare Screen Mock Data
export const mockComparePeriodA = {
  name: 'November 2026 (A)',
  views: '2.40M',
  reach: '1.98M',
  likes: '164.8K',
  shares: '12.4K',
  er: '6.84%',
  avgPerformance: 'High',
};

export const mockComparePeriodB = {
  name: 'October 2026 (B)',
  views: '1.70M',
  reach: '1.42M',
  likes: '118.2K',
  shares: '8.6K',
  er: '5.92%',
  avgPerformance: 'Medium',
};

export const mockCompareBreakdown = [
  { metric: 'Total Views', a: '2,400,000', b: '1,700,000', delta: '+41.2%', isPositive: true },
  { metric: 'Total Reach', a: '1,980,000', b: '1,420,000', delta: '+39.4%', isPositive: true },
  { metric: 'Total Likes', a: '164,800', b: '118,200', delta: '+39.4%', isPositive: true },
  { metric: 'Comments', a: '12,400', b: '9,800', delta: '+26.5%', isPositive: true },
  { metric: 'Shares', a: '18,600', b: '12,900', delta: '+44.2%', isPositive: true },
  { metric: 'Saves', a: '38,200', b: '26,400', delta: '+44.7%', isPositive: true },
  { metric: 'Engagement Rate', a: '6.84%', b: '5.92%', delta: '+0.92%', isPositive: true },
];

// Sample CSV Preview Data (Upload Screen)
export const mockCsvPreviewRows = [
  { post_id: 'P148', platform: 'Instagram', content_type: 'Reel', category: 'Travel', views: '412,600', likes: '34,800', status: 'Valid' },
  { post_id: 'P147', platform: 'Instagram', content_type: 'Carousel', category: 'Tech', views: '298,400', likes: '23,600', status: 'Valid' },
  { post_id: 'P146', platform: 'YouTube', content_type: 'Reel', category: 'Education', views: '241,000', likes: '17,400', status: 'Valid' },
  { post_id: 'P145', platform: 'YouTube', content_type: 'Video', category: 'Community', views: '164,500', likes: '8,400', status: 'Valid' },
];

// Mock Prediction Function (Deterministic based on post features)
export function calculateMockPrediction(params) {
  const { platform, content_type, category, duration_seconds = 20, hashtags_count = 5, posting_hour = 19 } = params;
  
  let score = 50;

  // Format bonus
  if (content_type === 'Reel') score += 18;
  else if (content_type === 'Carousel') score += 12;
  else if (content_type === 'Video') score += 6;
  
  // Timing bonus (evening prime window: 18 - 21)
  if (posting_hour >= 18 && posting_hour <= 21) score += 12;
  else if (posting_hour >= 12 && posting_hour <= 15) score += 4;
  else score -= 6;

  // Category alignment
  if (category === 'Travel') score += 8;
  else if (category === 'Tech') score += 6;
  else if (category === 'Education') score += 5;

  // Hashtags sweet spot
  if (hashtags_count >= 4 && hashtags_count <= 8) score += 6;
  else if (hashtags_count > 15) score -= 8;

  // Video duration sweet spot (20s - 40s)
  if (content_type === 'Reel') {
    if (duration_seconds >= 20 && duration_seconds <= 40) score += 6;
    else if (duration_seconds > 60) score -= 10;
  }

  // Bounds
  score = Math.max(15, Math.min(95, score));

  let tier = 'Medium';
  let desc = 'These characteristics indicate moderate performance potential.';
  let confidence = '82%';

  if (score >= 75) {
    tier = 'HIGH';
    desc = 'These characteristics historically align with high-performing posts in top percentile engagement.';
    confidence = '88%';
  } else if (score < 45) {
    tier = 'LOW';
    desc = 'Timing and format parameters suggest lower algorithmic reach. Consider adjusting posting hour or content format.';
    confidence = '79%';
  }

  return {
    score,
    tier,
    confidence,
    description: desc,
    model: 'Decision Tree Classifier',
  };
}
