import { useWindowDimensions } from 'react-native';

import { DesktopBreakpoint } from '@/constants/theme';

export function useResponsiveLayout() {
  const { height, width } = useWindowDimensions();
  const isDesktop = width >= DesktopBreakpoint;

  return {
    height,
    isDesktop,
    isMobile: !isDesktop,
    width,
  };
}
