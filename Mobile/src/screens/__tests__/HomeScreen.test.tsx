import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { useHaptics } from '../../providers/haptics';
import { Platform } from 'react-native';

// Mock the haptics provider
jest.mock('../../providers/haptics', () => ({
  useHaptics: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('HomeScreen', () => {
  const mockTriggerImpact = jest.fn();

  beforeEach(() => {
    (useHaptics as unknown as jest.Mock).mockReturnValue({
      triggerImpact: mockTriggerImpact
    });
    jest.clearAllMocks();
  });

  it('renders correctly on iOS', () => {
    Platform.OS = 'ios';
    const { getByText, getByText: assertText } = render(<HomeScreen />);
    
    expect(getByText('Fiip Mobile')).toBeTruthy();
    expect(getByText("Bienvenue dans l'expérience Liquid Glass")).toBeTruthy();
    expect(getByText('Explorer')).toBeTruthy();
  });

  it('renders correctly on Android', () => {
    Platform.OS = 'android';
    const { getByText } = render(<HomeScreen />);
    
    expect(getByText('Fiip Mobile')).toBeTruthy();
    expect(getByText("Bienvenue dans l'expérience Material Design 3")).toBeTruthy();
    expect(getByText('Explorer')).toBeTruthy();
  });

  it('triggers haptic feedback on Explorer button press', () => {
    Platform.OS = 'ios';
    const { getByText } = render(<HomeScreen />);
    
    const explorerButton = getByText('Explorer');
    fireEvent.press(explorerButton);

    expect(mockTriggerImpact).toHaveBeenCalledWith('heavy');
  });
});
