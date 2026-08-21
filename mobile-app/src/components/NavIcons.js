import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

/**
 * ICONLY VECTOR ICON SYSTEM (Curved, Two-Tone & Bold Styles)
 * Engineered for React Native Expo Mobile App
 */

export function HomeIcon({ color = '#8E8E93', filled = false, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.15722 20.7714V17.7047C9.15722 16.9247 9.79222 16.2907 10.5722 16.2907H13.4322C14.2122 16.2907 14.8472 16.9247 14.8472 17.7047V20.7714C14.8472 21.4487 15.3962 21.9987 16.0732 21.9987H18.2632C20.1412 21.9987 21.6632 20.4767 21.6632 18.5987V10.9157C21.6632 10.0827 21.2822 9.2947 20.6302 8.7777L14.3632 3.8057C12.9832 2.7107 11.0232 2.7107 9.64322 3.8057L3.37622 8.7777C2.72422 9.2947 2.34322 10.0827 2.34322 10.9157V18.5987C2.34322 20.4767 3.86522 21.9987 5.74322 21.9987H7.93322 C8.61022 21.9987 9.15722 21.4487 9.15722 20.7714Z"
        stroke={color}
        strokeWidth={filled ? 2.2 : 1.8}
        fill={filled ? `${color}25` : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DamageIcon({ color = '#8E8E93', filled = false, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke={color}
        strokeWidth={filled ? 2.2 : 1.8}
        fill={filled ? `${color}20` : 'none'}
      />
      <Path
        d="M13 7L9.5 13H14.5L11 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RequestIcon({ color = '#8E8E93', filled = false, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.17004 7.44006L12 2.37006L20.83 7.44006V16.5601L12 21.6301L3.17004 16.5601V7.44006Z"
        stroke={color}
        strokeWidth={filled ? 2.2 : 1.8}
        fill={filled ? `${color}25` : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 2.37006V12.0001" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 12.0001L20.83 7.44006" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 12.0001L3.17004 7.44006" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function SettingsIcon({ color = '#8E8E93', filled = false, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        stroke={color}
        strokeWidth={1.8}
        fill={filled ? color : 'none'}
      />
      <Path
        d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 0 1 19.79 19.71A2 2 0 0 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V20.91A2 2 0 0 1 12.08 22.91A2 2 0 0 1 10.08 20.91V20.82A1.65 1.65 0 0 0 9.08 19.31A1.65 1.65 0 0 0 7.26 19.64L7.2 19.7A2 2 0 0 1 4.37 19.7A2 2 0 0 1 4.37 16.87L4.43 16.81A1.65 1.65 0 0 0 4.76 14.99A1.65 1.65 0 0 0 3.25 13.99H3.17A2 2 0 0 1 1.17 11.99A2 2 0 0 1 3.17 9.99H3.26A1.65 1.65 0 0 0 4.77 8.99A1.65 1.65 0 0 0 4.44 7.17L4.38 7.11A2 2 0 0 1 4.38 4.28A2 2 0 0 1 7.21 4.28L7.27 4.34A1.65 1.65 0 0 0 9.09 4.67H9.17A1.65 1.65 0 0 0 10.17 3.16V3.08A2 2 0 0 1 12.17 1.08A2 2 0 0 1 14.17 3.08V3.17A1.65 1.65 0 0 0 15.17 4.68A1.65 1.65 0 0 0 16.99 4.35L17.05 4.29A2 2 0 0 1 19.88 4.29A2 2 0 0 1 19.88 7.12L19.82 7.18A1.65 1.65 0 0 0 19.49 9V9.08A1.65 1.65 0 0 0 21 10.08H21.08A2 2 0 0 1 23.08 12.08A2 2 0 0 1 21.08 14.08H20.99A1.65 1.65 0 0 0 19.48 15.09"
        stroke={color}
        strokeWidth={filled ? 2.2 : 1.8}
        fill={filled ? `${color}20` : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({ color = '#8E8E93', filled = false, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.68629 2 6 4.68629 6 8V12.09C6 12.72 5.72 13.31 5.24 13.71L3.92 14.81C2.86 15.7 3.49 17.5 4.89 17.5H19.11C20.51 17.5 21.14 15.7 20.08 14.81L18.76 13.71C18.28 13.31 18 12.72 18 12.09V8C18 4.68629 15.3137 2 12 2Z"
        stroke={color}
        strokeWidth={filled ? 2.2 : 1.8}
        fill={filled ? `${color}25` : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14.25 20.5C13.68 21.42 12.89 22 12 22C11.11 22 10.32 21.42 9.75 20.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function GlobeIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M2 12H22" stroke={color} strokeWidth={1.8} />
      <Path d="M12 2C14.5 4.7 16 8.2 16 12C16 15.8 14.5 19.3 12 22C9.5 19.3 8 15.8 8 12C8 8.2 9.5 4.7 12 2Z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function MedicineIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="8" transform="rotate(45 12 12)" stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M7.76 7.76L16.24 16.24" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ShelterIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 20L12 3L21 20H3Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M9.5 20L12 12.5L14.5 20" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PinIcon({ color = '#8E8E93', size = 14 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21C12 21 19 14.5 19 9.5C19 5.63 15.87 2.5 12 2.5C8.13 2.5 5 5.63 5 9.5C5 14.5 12 21 12 21Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <Circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function UserIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="4.5" stroke={color} strokeWidth={1.8} />
      <Path d="M4 21C4 16.58 7.58 13 12 13C16.42 13 20 16.58 20 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ShieldIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.5L19.5 6V11.5C19.5 16.5 16.2 20.8 12 22C7.8 20.8 4.5 16.5 4.5 11.5V6L12 2.5Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function LockIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="11" width="14" height="10" rx="3" stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function InfoIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={1.8} />
      <Path d="M12 8V8.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M12 11.5V16.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function TrashIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 7.5H19.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9.5 4.5H14.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6 7.5L7 19C7 20.1 7.9 21 9 21H15C16.1 21 17 20.1 17 19L18 7.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CameraIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8C4 6.9 4.9 6 6 6H8.5L10 4H14L15.5 6H18C19.1 6 20 6.9 20 8V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V8Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="12" cy="13" r="3.5" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function GalleryIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="3.5" width="17" height="17" rx="3.5" stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx="8.5" cy="8.5" r="1.8" stroke={color} strokeWidth={1.8} />
      <Path d="M4 17L9.5 11.5L14 16L17.5 12.5L20 15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 12.5L9.5 17.5L19.5 6.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function QRIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Path d="M14 14H16V16H14V14Z" fill={color} />
      <Path d="M18 18H20V20H18V18Z" fill={color} />
      <Path d="M18 14H20V16H18V14Z" fill={color} />
      <Path d="M14 18H16V20H14V18Z" fill={color} />
    </Svg>
  );
}

export function RefreshIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10C20 6.5 16.8 4 13 4C8 4 4 8 4 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M21 4V10H15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 14C4 17.5 7.2 20 11 20C16 20 20 16 20 11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M3 20V14H9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4.5L16.5 12L9 19.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowLeftIcon({ color = '#8E8E93', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19.5 12H4.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.5 5L4.5 12L11.5 19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

