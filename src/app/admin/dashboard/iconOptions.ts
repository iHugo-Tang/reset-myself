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
	{ value: 'Target', label: 'Target', Icon: Target },
	{ value: 'Flag', label: 'Flag', Icon: Flag },
	{ value: 'Star', label: 'Star', Icon: Star },
	{ value: 'Heart', label: 'Heart', Icon: Heart },
	{ value: 'Zap', label: 'Lightning', Icon: Zap },
	{ value: 'Trophy', label: 'Trophy', Icon: Trophy },
	{ value: 'CheckCircle2', label: 'Completed', Icon: CheckCircle2 },
	{ value: 'BookOpen', label: 'Reading', Icon: BookOpen },
	{ value: 'Dumbbell', label: 'Workout', Icon: Dumbbell },
	{ value: 'Coffee', label: 'Coffee', Icon: Coffee },
	{ value: 'Leaf', label: 'Nature', Icon: Leaf },
	{ value: 'Sparkles', label: 'Sparkles', Icon: Sparkles },
];

export const ICON_MAP = ICON_OPTIONS.reduce<Record<string, LucideIcon>>(
	(acc, cur) => {
		acc[cur.value] = cur.Icon;
		return acc;
	},
	{}
);

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
