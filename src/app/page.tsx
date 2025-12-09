import { redirect } from 'next/navigation';

export default function Home() {
	// 将根路径直接重定向到时间线视图
	redirect('/timeline');
}
