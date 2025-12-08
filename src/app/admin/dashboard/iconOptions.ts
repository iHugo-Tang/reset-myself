import {
	BookOpen,
	CheckCircle2,
	Coffee,
	Dumbbell,
	Flag,
	Heart,
	Leaf,
	Sparkles,
	Star,
	Target,
	Trophy,
	Zap,
	type LucideIcon,
} from 'lucide-react';

export type IconOption = { value: string; label: string; Icon: LucideIcon };

export const ICON_OPTIONS: IconOption[] = [
	{ value: 'Target', label: '靶心', Icon: Target },
	{ value: 'Flag', label: '旗标', Icon: Flag },
	{ value: 'Star', label: '星标', Icon: Star },
	{ value: 'Heart', label: '心形', Icon: Heart },
	{ value: 'Zap', label: '闪电', Icon: Zap },
	{ value: 'Trophy', label: '奖杯', Icon: Trophy },
	{ value: 'CheckCircle2', label: '完成', Icon: CheckCircle2 },
	{ value: 'BookOpen', label: '阅读', Icon: BookOpen },
	{ value: 'Dumbbell', label: '健身', Icon: Dumbbell },
	{ value: 'Coffee', label: '咖啡', Icon: Coffee },
	{ value: 'Leaf', label: '自然', Icon: Leaf },
	{ value: 'Sparkles', label: '闪光', Icon: Sparkles },
];

export const ICON_MAP = ICON_OPTIONS.reduce<Record<string, LucideIcon>>((acc, cur) => {
	acc[cur.value] = cur.Icon;
	return acc;
}, {});

export const COLOR_OPTIONS = [
	'#0ea5e9', // sky
	'#6366f1', // indigo
	'#22c55e', // green
	'#10b981', // emerald
	'#14b8a6', // teal
	'#f59e0b', // amber
	'#ef4444', // red
	'#ec4899', // pink
	'#a855f7', // purple
	'#64748b', // slate
];

export const DEFAULT_ICON = ICON_OPTIONS[0]?.value ?? 'Target';
export const DEFAULT_COLOR = COLOR_OPTIONS[3] ?? '#10b981';
