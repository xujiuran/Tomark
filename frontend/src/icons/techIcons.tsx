import React from 'react';

export interface TechIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

/**
 * 1. QuantumLogoIcon - 量子晶核品牌微标
 * 用于应用顶部导航与品牌展示，科技质感聚合节点
 */
export const QuantumLogoIcon: React.FC<TechIconProps> = ({ size = 20, className = '', glow = true, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : ''}`}
    {...props}
  >
    <polygon
      points="12,2 21,7.5 21,16.5 12,22 3,16.5 3,7.5"
      stroke="url(#quantum-grad)"
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill="#0c1222"
      fillOpacity="0.8"
    />
    <polygon
      points="12,6 18,9.5 18,14.5 12,18 6,14.5 6,9.5"
      stroke="#60a5fa"
      strokeWidth="1.2"
      strokeDasharray="2 1.5"
      fill="none"
    />
    <circle cx="12" cy="12" r="2.5" fill="#38bdf8" />
    <defs>
      <linearGradient id="quantum-grad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="0.5" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * 2. TerminalCodeIcon - 代码与开源平台
 * 赛博绿微光，尖括号终端与分支符号
 */
export const TerminalCodeIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : ''}`}
    {...props}
  >
    <rect x="2.5" y="3.5" width="19" height="17" rx="3.5" stroke="#22c55e" strokeWidth="1.6" fill="#052e16" fillOpacity="0.35" />
    <path d="M7 8.5L10.5 12L7 15.5" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="16" x2="16.5" y2="16" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
    <circle cx="18" cy="6.5" r="1" fill="#22c55e" />
  </svg>
);

/**
 * 3. VideoPulseIcon - 视频与流媒体
 * 霓虹紫微光，晶体多边形播放按键与频段波纹
 */
export const VideoPulseIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]' : ''}`}
    {...props}
  >
    <rect x="2.5" y="4" width="19" height="16" rx="4" stroke="#a855f7" strokeWidth="1.6" fill="#3b0764" fillOpacity="0.35" />
    <polygon points="10,8.5 16,12 10,15.5" stroke="#c084fc" strokeWidth="1.5" fill="#a855f7" fillOpacity="0.7" strokeLinejoin="round" />
    <path d="M4 18L6.5 16" stroke="#c084fc" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M20 6L17.5 8" stroke="#c084fc" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * 4. DocCircuitIcon - 技术文档与教程
 * 赛博蓝微光，集成电路引脚与规范书卷
 */
export const DocCircuitIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]' : ''}`}
    {...props}
  >
    <path d="M4 4.5C4 3.67 4.67 3 5.5 3H15L20 8V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5V4.5Z" stroke="#38bdf8" strokeWidth="1.6" fill="#082f49" fillOpacity="0.35" />
    <path d="M14 3V8.5H19.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 12H16" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" />
    <path d="M8 16H13" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="12" r="1.2" fill="#38bdf8" />
  </svg>
);

/**
 * 5. NodeNetworkIcon - 技术博客与社区
 * 极客青微光，分布式节点与星状数据交换链路
 */
export const NodeNetworkIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(45,212,191,0.6)]' : ''}`}
    {...props}
  >
    <circle cx="12" cy="12" r="3.2" stroke="#2dd4bf" strokeWidth="1.6" fill="#134e4a" fillOpacity="0.6" />
    <circle cx="5" cy="7" r="2.2" stroke="#2dd4bf" strokeWidth="1.4" fill="#042f2e" />
    <circle cx="19" cy="7" r="2.2" stroke="#2dd4bf" strokeWidth="1.4" fill="#042f2e" />
    <circle cx="17" cy="18" r="2.2" stroke="#2dd4bf" strokeWidth="1.4" fill="#042f2e" />
    <circle cx="7" cy="18" r="2.2" stroke="#2dd4bf" strokeWidth="1.4" fill="#042f2e" />
    <line x1="7" y1="8" x2="10" y2="10.5" stroke="#5eead4" strokeWidth="1.2" />
    <line x1="17" y1="8" x2="14" y2="10.5" stroke="#5eead4" strokeWidth="1.2" />
    <line x1="15.5" y1="16.5" x2="13.5" y2="14.5" stroke="#5eead4" strokeWidth="1.2" />
    <line x1="8.5" y1="16.5" x2="10.5" y2="14.5" stroke="#5eead4" strokeWidth="1.2" />
  </svg>
);

/**
 * 6. NeuralChipIcon - AI 与前沿技术
 * 荧光蓝紫微光，神经突触核心与晶圆矩阵
 */
export const NeuralChipIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_7px_rgba(96,165,250,0.7)]' : ''}`}
    {...props}
  >
    <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" stroke="#60a5fa" strokeWidth="1.6" fill="#1e1b4b" fillOpacity="0.5" />
    <circle cx="12" cy="12" r="2.5" fill="#818cf8" />
    {/* 引脚 */}
    <path d="M9 2V5.5M15 2V5.5M9 18.5V22M15 18.5V22M2 9H5.5M2 15H5.5M18.5 9H22M18.5 15H22" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="12" y1="9.5" x2="12" y2="7.5" stroke="#c7d2fe" strokeWidth="1.2" />
    <line x1="12" y1="14.5" x2="12" y2="16.5" stroke="#c7d2fe" strokeWidth="1.2" />
  </svg>
);

/**
 * 7. PrismLayersIcon - 设计与视觉灵感
 * 电光粉/洋红微光，多面棱镜与矢量图层
 */
export const PrismLayersIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]' : ''}`}
    {...props}
  >
    <polygon points="12,2.5 21,7.5 12,12.5 3,7.5" stroke="#f472b6" strokeWidth="1.6" fill="#500724" fillOpacity="0.4" strokeLinejoin="round" />
    <path d="M3 12L12 17L21 12" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 16.5L12 21.5L21 16.5" stroke="#fb7185" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 8. TurboCoreIcon - 效率与开发工具
 * 能量金/琥珀微光，涡轮增压机与离子推进器
 */
export const TurboCoreIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : ''}`}
    {...props}
  >
    <circle cx="12" cy="12" r="8.5" stroke="#fbbf24" strokeWidth="1.6" fill="#451a03" fillOpacity="0.35" />
    <path d="M12 3.5V6.5M12 17.5V20.5M3.5 12H6.5M17.5 12H20.5" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
    <polygon points="12.5,7 8.5,13 12,13 11.5,17 15.5,11 12,11" stroke="#fde047" strokeWidth="1.2" fill="#fbbf24" strokeLinejoin="round" />
  </svg>
);

/**
 * 9. SignalRadarIcon - 资讯与社交媒体
 * 太空青微光，雷达扫描角与全球卫星网络
 */
export const SignalRadarIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(14,165,233,0.6)]' : ''}`}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="#0ea5e9" strokeWidth="1.6" fill="#082f49" fillOpacity="0.3" />
    <circle cx="12" cy="12" r="5" stroke="#38bdf8" strokeWidth="1.3" strokeDasharray="2.5 1.5" />
    <circle cx="12" cy="12" r="1.8" fill="#38bdf8" />
    <path d="M12 12L17.5 7" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="17.5" cy="7" r="1.5" fill="#bae6fd" />
  </svg>
);

/**
 * 10. GrowthMatrixIcon - 商业与职场金融
 * 翡翠绿微光，加密金库与对数增长曲线
 */
export const GrowthMatrixIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]' : ''}`}
    {...props}
  >
    <rect x="3" y="3.5" width="18" height="17" rx="3" stroke="#10b981" strokeWidth="1.6" fill="#064e3b" fillOpacity="0.35" />
    <path d="M7 16L11 12L14 15L18 9" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="15,9 18,9 18,12" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 11. ZenOrbitIcon - 生活与日常休闲
 * 暖阳金/流光橙微光，双天体轨道与舒缓环礁
 */
export const ZenOrbitIcon: React.FC<TechIconProps> = ({ size = 16, className = '', glow = false, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className} ${glow ? 'filter drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]' : ''}`}
    {...props}
  >
    <circle cx="12" cy="12" r="4.2" stroke="#f97316" strokeWidth="1.6" fill="#431407" fillOpacity="0.4" />
    <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-30 12 12)" stroke="#fb923c" strokeWidth="1.4" strokeDasharray="3 2" />
    <circle cx="18" cy="8.5" r="1.5" fill="#fdba74" />
  </svg>
);

/**
 * 12. DefaultFolderTechIcon - 默认科技文件夹/未归类
 */
export const DefaultFolderTechIcon: React.FC<TechIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    {...props}
  >
    <path d="M3 5.5C3 4.67 3.67 4 4.5 4H9.5L11.5 6.5H19.5C20.33 6.5 21 7.17 21 8V18.5C21 19.33 20.33 20 19.5 20H4.5C3.67 20 3 19.33 3 18.5V5.5Z" stroke="#64748b" strokeWidth="1.6" fill="#1e293b" fillOpacity="0.5" />
    <line x1="7" y1="13" x2="17" y2="13" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2" />
  </svg>
);

/**
 * 13. FileMarkdownIcon - Markdown 文档格式 (.md)
 */
export const FileMarkdownIcon: React.FC<TechIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    {...props}
  >
    <rect x="3" y="3.5" width="18" height="17" rx="3" stroke="#38bdf8" strokeWidth="1.6" fill="#082f49" fillOpacity="0.4" />
    <path d="M6.5 15V9L9 12.5L11.5 9V15" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12V15M13.5 13.5L15 15L16.5 13.5" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 14. FileCodeIcon - 代码脚本文件 (.ts, .js, .go, .py, .rs)
 */
export const FileCodeIcon: React.FC<TechIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    {...props}
  >
    <path d="M4 4.5C4 3.67 4.67 3 5.5 3H15L20 8V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5V4.5Z" stroke="#22c55e" strokeWidth="1.6" fill="#052e16" fillOpacity="0.4" />
    <path d="M9.5 11L7.5 13L9.5 15" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.5 11L16.5 13L14.5 15" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12.5" y1="10.5" x2="11.5" y2="15.5" stroke="#4ade80" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/**
 * 15. FileWebIcon - Web 网址/HTML 页面
 */
export const FileWebIcon: React.FC<TechIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    {...props}
  >
    <rect x="3" y="4" width="18" height="16" rx="3" stroke="#60a5fa" strokeWidth="1.6" fill="#1e1b4b" fillOpacity="0.3" />
    <line x1="3" y1="8.5" x2="21" y2="8.5" stroke="#60a5fa" strokeWidth="1.2" />
    <circle cx="6" cy="6.2" r="0.9" fill="#93c5fd" />
    <circle cx="8.5" cy="6.2" r="0.9" fill="#93c5fd" />
    <circle cx="11" cy="6.2" r="0.9" fill="#93c5fd" />
    <ellipse cx="12" cy="14" rx="4" ry="3.5" stroke="#93c5fd" strokeWidth="1.2" />
  </svg>
);

/**
 * 16. FileDatabaseIcon - 数据库与持久化存储 (.db, .sql, .sqlite)
 */
export const FileDatabaseIcon: React.FC<TechIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    {...props}
  >
    <ellipse cx="12" cy="6" rx="7.5" ry="3" stroke="#a855f7" strokeWidth="1.5" fill="#3b0764" fillOpacity="0.5" />
    <path d="M4.5 6V12C4.5 13.66 7.86 15 12 15C16.14 15 19.5 13.66 19.5 12V6" stroke="#a855f7" strokeWidth="1.5" />
    <path d="M4.5 12V18C4.5 19.66 7.86 21 12 21C16.14 21 19.5 19.66 19.5 18V12" stroke="#c084fc" strokeWidth="1.5" />
  </svg>
);

/**
 * 17. FileArchiveIcon - 压缩包与归档文件 (.zip, .tar, .dmg)
 */
export const FileArchiveIcon: React.FC<TechIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    {...props}
  >
    <path d="M4 4.5C4 3.67 4.67 3 5.5 3H18.5C19.33 3 20 3.67 20 4.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5V4.5Z" stroke="#f59e0b" strokeWidth="1.6" fill="#451a03" fillOpacity="0.4" />
    <path d="M10 3V21M14 3V21" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="2 2" />
    <rect x="9" y="11" width="6" height="4" rx="1" stroke="#fde047" strokeWidth="1.2" fill="#78350f" />
  </svg>
);

// -------------------------------------------------------------
// 辅助映射字典与检索工具
// -------------------------------------------------------------

export const CATEGORY_TECH_ICON_MAP: Record<string, React.FC<TechIconProps>> = {
  '代码与开源平台': TerminalCodeIcon,
  '视频与流媒体': VideoPulseIcon,
  '技术文档与教程': DocCircuitIcon,
  '技术博客与社区': NodeNetworkIcon,
  'AI 与前沿技术': NeuralChipIcon,
  '设计与视觉灵感': PrismLayersIcon,
  '效率与开发工具': TurboCoreIcon,
  '资讯与社交媒体': SignalRadarIcon,
  '商业与职场金融': GrowthMatrixIcon,
  '生活与日常休闲': ZenOrbitIcon,
};

export const CATEGORY_ACCENT_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  '代码与开源平台': { border: 'border-emerald-500/30', bg: 'bg-emerald-950/30', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  '视频与流媒体': { border: 'border-purple-500/30', bg: 'bg-purple-950/30', text: 'text-purple-300', dot: 'bg-purple-400' },
  '技术文档与教程': { border: 'border-sky-500/30', bg: 'bg-sky-950/30', text: 'text-sky-300', dot: 'bg-sky-400' },
  '技术博客与社区': { border: 'border-teal-500/30', bg: 'bg-teal-950/30', text: 'text-teal-300', dot: 'bg-teal-400' },
  'AI 与前沿技术': { border: 'border-blue-500/30', bg: 'bg-blue-950/30', text: 'text-blue-300', dot: 'bg-blue-400' },
  '设计与视觉灵感': { border: 'border-pink-500/30', bg: 'bg-pink-950/30', text: 'text-pink-300', dot: 'bg-pink-400' },
  '效率与开发工具': { border: 'border-amber-500/30', bg: 'bg-amber-950/30', text: 'text-amber-300', dot: 'bg-amber-400' },
  '资讯与社交媒体': { border: 'border-cyan-500/30', bg: 'bg-cyan-950/30', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  '商业与职场金融': { border: 'border-emerald-600/30', bg: 'bg-emerald-950/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  '生活与日常休闲': { border: 'border-orange-500/30', bg: 'bg-orange-950/30', text: 'text-orange-300', dot: 'bg-orange-400' },
};

/**
 * 根据大类名称返回对应的科技感图标
 */
export const getCategoryTechIcon = (categoryName: string, size = 15, className = '', glow = false) => {
  const IconComponent = CATEGORY_TECH_ICON_MAP[categoryName] || DefaultFolderTechIcon;
  return <IconComponent size={size} className={className} glow={glow} />;
};

/**
 * 图鉴展示专用元数据列表
 */
export const ALL_TECH_ICONS_SHOWCASE = [
  {
    group: '核心分类科技微标 (Categories)',
    items: [
      { name: '代码与开源平台', en: 'TerminalCode', icon: TerminalCodeIcon, color: '#22c55e', desc: '命令行终端与分支节点' },
      { name: '视频与流媒体', en: 'VideoPulse', icon: VideoPulseIcon, color: '#a855f7', desc: '多边形晶体播放器与音波' },
      { name: '技术文档与教程', en: 'DocCircuit', icon: DocCircuitIcon, color: '#38bdf8', desc: '规范书卷与集成电路引脚' },
      { name: '技术博客与社区', en: 'NodeNetwork', icon: NodeNetworkIcon, color: '#2dd4bf', desc: '分布式星状拓扑网络' },
      { name: 'AI 与前沿技术', en: 'NeuralChip', icon: NeuralChipIcon, color: '#60a5fa', desc: '神经芯片与量子晶圆' },
      { name: '设计与视觉灵感', en: 'PrismLayers', icon: PrismLayersIcon, color: '#f472b6', desc: '等距折射棱镜与矢量图层' },
      { name: '效率与开发工具', en: 'TurboCore', icon: TurboCoreIcon, color: '#fbbf24', desc: '涡轮离子加速推进核心' },
      { name: '资讯与社交媒体', en: 'SignalRadar', icon: SignalRadarIcon, color: '#0ea5e9', desc: '全球卫星扫描与对数天线' },
      { name: '商业与职场金融', en: 'GrowthMatrix', icon: GrowthMatrixIcon, color: '#10b981', desc: '增长矩阵与加密资产金库' },
      { name: '生活与日常休闲', en: 'ZenOrbit', icon: ZenOrbitIcon, color: '#f97316', desc: '舒缓行星引力轨道' },
    ]
  },
  {
    group: '常见文件与代码协议图鉴 (Files & Protocols)',
    items: [
      { name: 'Markdown 笔记', en: '.md / .doc', icon: FileMarkdownIcon, color: '#38bdf8', desc: '原生 Markdown 标题与结构' },
      { name: '源代码文件', en: '.ts / .go / .py', icon: FileCodeIcon, color: '#22c55e', desc: '尖括号代码与脚本符号' },
      { name: 'Web 原网链接', en: 'URL / HTML', icon: FileWebIcon, color: '#60a5fa', desc: '标准浏览器视窗与全域经纬' },
      { name: '数据库与持久层', en: '.db / .sqlite', icon: FileDatabaseIcon, color: '#a855f7', desc: '多级关系型磁盘柱面阵列' },
      { name: '归档与压缩包', en: '.zip / .pkg', icon: FileArchiveIcon, color: '#f59e0b', desc: '紧凑型绑带归档数据包' },
    ]
  },
  {
    group: '系统级品牌徽标 (Brand & System)',
    items: [
      { name: 'Linkit 量子晶核', en: 'Quantum Logo', icon: QuantumLogoIcon, color: '#38bdf8', desc: '六角双棱镜聚合知识核' },
      { name: '默认科技目录', en: 'Tech Folder', icon: DefaultFolderTechIcon, color: '#94a3b8', desc: '带全息卡槽的通用收纳夹' },
    ]
  }
];
