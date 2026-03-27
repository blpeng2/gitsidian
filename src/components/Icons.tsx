export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const BaseIcon = ({ children, className = '', ...props }: IconProps & { children: React.ReactNode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

export const IconGraph = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="5" cy="11" r="2" />
    <circle cx="11" cy="11" r="2" />
    <circle cx="8" cy="5" r="2" />
    <path d="M6 9.5l1.5-3M10 9.5L8.5 6.5" />
    <path d="M6.5 11h3" />
  </BaseIcon>
);

export const IconDiary = (props: IconProps) => (
  <BaseIcon {...props}>
    <rect x="3" y="2" width="10" height="12" rx="1" />
    <path d="M6 2v12" />
    <path d="M8 5h3" />
    <path d="M8 7.5h3" />
    <path d="M8 10h2" />
  </BaseIcon>
);

export const IconNote = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 2v12h10V5.5L9.5 2H3z" />
    <path d="M9 2v4h4" />
  </BaseIcon>
);

export const IconSettings = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M8 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    <path d="M13.4 8c0-.4-.1-.8-.2-1.2l1.3-1-1.4-2.4-1.5.6c-.4-.3-.8-.5-1.3-.6L10 2H6l-.3 1.4c-.4.1-.8.3-1.3.6l-1.5-.6-1.4 2.4 1.3 1c-.1.4-.2.8-.2 1.2s.1.8.2 1.2l-1.3 1 1.4 2.4 1.5-.6c.4.3.8.5 1.3.6l.3 1.4h4l.3-1.4c.4-.1.8-.3 1.3-.6l1.5.6 1.4-2.4-1.3-1c.1-.4.2-.8.2-1.2z" />
  </BaseIcon>
);

export const IconAI = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2z" />
  </BaseIcon>
);

export const IconSidebarOpen = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 2v12M8 5l-3 3 3 3M13 5l-3 3 3 3" />
  </BaseIcon>
);

export const IconSidebarClose = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 2v12M8 5l3 3-3 3M3 5l3 3-3 3" />
  </BaseIcon>
);

export const IconLock = (props: IconProps) => (
  <BaseIcon {...props}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5 7V4.5a3 3 0 1 1 6 0V7" />
  </BaseIcon>
);

export const IconGlobe = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="M2.5 8h11M8 2c-2 0-3.5 2.5-3.5 6s1.5 6 3.5 6 3.5-2.5 3.5-6-1.5-6-3.5-6z" />
  </BaseIcon>
);

export const IconClose = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 4L4 12M4 4l8 8" />
  </BaseIcon>
);

export const IconEdit = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L4.5 13.5H2.5v-2L11.5 2.5z" />
  </BaseIcon>
);

export const IconPlus = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M8 3v10M3 8h10" />
  </BaseIcon>
);

export const IconChevronDown = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 6l4 4 4-4" />
  </BaseIcon>
);

export const IconChevronRight = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M6 4l4 4-4 4" />
  </BaseIcon>
);

export const IconInbox = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M2 3h12v10H2V3zM2 7h3l1 2h4l1-2h3" />
  </BaseIcon>
);

export const IconActive = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M8 2l-4 6h4l-1 6 5-7H8l1-5z" />
  </BaseIcon>
);

export const IconReference = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 2v12l4-2 4 2V2H4z" />
  </BaseIcon>
);

export const IconArchive = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 4h10v2H3V4zM4 6v8h8V6" />
    <path d="M7 9h2" />
  </BaseIcon>
);

export const IconLink = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M7 5a3.5 3.5 0 0 1 4 4l-1.5 1.5a3.5 3.5 0 0 1-5-5l1.5-1.5" />
    <path d="M9 11a3.5 3.5 0 0 1-4-4l1.5-1.5a3.5 3.5 0 0 1 5 5L10 12" />
  </BaseIcon>
);

export const IconBold = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 3h5a3 3 0 0 1 0 6H4V3z" />
    <path d="M4 9h6a3 3 0 0 1 0 6H4V9z" />
  </BaseIcon>
);

export const IconItalic = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M7 2h5M4 14h5M9 2L7 14" />
  </BaseIcon>
);

export const IconStrikethrough = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 5c0-1.7-1.3-3-3-3H7C5.3 2 4 3.3 4 5s1.3 3 3 3h2c1.7 0 3 1.3 3 3s-1.3 3-3 3H7c-1.7 0-3-1.3-3-3" />
    <path d="M2 8h12" />
  </BaseIcon>
);

export const IconH1 = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 3v10M3 8h6M9 3v10M13 6v7M11 7l2-1" />
  </BaseIcon>
);

export const IconH2 = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M2 3v10M2 8h6M8 3v10M11 6c1.1 0 2 .9 2 2 0 2.2-3 4-3 4h4" />
  </BaseIcon>
);

export const IconH3 = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M2 3v10M2 8h6M8 3v10M11 6h3s-1 2-1 3c1 0 2 1 2 2.5s-1.5 2.5-3 1.5" />
  </BaseIcon>
);

export const IconBulletList = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M6 4h8M6 8h8M6 12h8" />
    <circle cx="3" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
  </BaseIcon>
);

export const IconNumberedList = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M6 4h8M6 8h8M6 12h8M3 5V2L2 3M2 9h2M2 12c1-1 2-.5 2 0s-1 1.5-2 2h2" />
  </BaseIcon>
);

export const IconCheckbox = (props: IconProps) => (
  <BaseIcon {...props}>
    <rect x="3" y="3" width="10" height="10" rx="2" />
    <path d="M6 8l2 2 4-4" />
  </BaseIcon>
);

export const IconWikiLink = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M5 2H3v12h2M11 2h2v12h-2" />
  </BaseIcon>
);

export const IconCode = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M6 12L2 8l4-4M10 4l4 4-4 4" />
  </BaseIcon>
);

export const IconCodeBlock = (props: IconProps) => (
  <BaseIcon {...props}>
    <rect x="2" y="3" width="12" height="10" rx="2" />
    <path d="M5 6l2 2-2 2M9 10h2" />
  </BaseIcon>
);

export const IconQuote = (props: IconProps) => (
  <BaseIcon {...props} fill="currentColor" stroke="none">
    <path d="M4.5 9c1.4 0 2.5 1.1 2.5 2.5S5.9 14 4.5 14 2 12.9 2 11.5c0-2.8 2-5 3.5-6.5L6 6c-1.2 1-2.1 2.1-2.3 3h.8zm7 0c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5-2.5-1.1-2.5-2.5c0-2.8 2-5 3.5-6.5L13 6c-1.2 1-2.1 2.1-2.3 3h.8z" />
  </BaseIcon>
);

export const IconHRule = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M2 8h12" />
  </BaseIcon>
);

export const IconImage = (props: IconProps) => (
  <BaseIcon {...props}>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <circle cx="6" cy="6" r="1.5" />
    <path d="M14 9l-4-4-5 5-1-1-2 2" />
  </BaseIcon>
);

export const IconFitView = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M4 2H2v2M12 2h2v2M4 14H2v-2M12 14h2v-2M6 6h4v4H6z" />
  </BaseIcon>
);

export const IconRelayout = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M2 8a6 6 0 1 1 2 4M2 8V4M2 8h4" />
  </BaseIcon>
);

export const IconLocalGraph = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="8" cy="8" r="3" />
    <circle cx="3" cy="3" r="1.5" />
    <circle cx="13" cy="13" r="1.5" />
    <path d="M4 4l2.5 2.5M12 12L9.5 9.5" />
  </BaseIcon>
);

export const IconGlobalGraph = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="8" cy="8" r="6" />
    <path d="M2 8h12M8 2v12M4 4l8 8M12 4L4 12" />
  </BaseIcon>
);

export const IconLightbulb = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M8 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5v1.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1.5c1.2-.7 2-2 2-3.5a4 4 0 0 0-4-4z" />
    <path d="M7 14h2" />
  </BaseIcon>
);

export const IconLoading = (props: IconProps) => (
  <BaseIcon {...props} className={`animate-spin ${props.className || ''}`}>
    <path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.8 3.8l1.4 1.4M10.8 10.8l1.4 1.4M3.8 12.2l1.4-1.4M10.8 5.2l1.4-1.4" />
  </BaseIcon>
);
