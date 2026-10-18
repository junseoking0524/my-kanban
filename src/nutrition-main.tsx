import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import NutritionView from './NutritionView';
import './nutrition-standalone.css';
createRoot(document.getElementById('root')!).render(<StrictMode><div className="nutrition-shell"><div className="nutrition-topbar"><a href="/?view=nutrition">← 칸반 대시보드</a><span>입력·관리 전용</span></div><NutritionView/></div></StrictMode>);
