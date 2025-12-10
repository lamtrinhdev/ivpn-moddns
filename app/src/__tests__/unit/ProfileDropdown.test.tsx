import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileDropdown from '@/pages/header/ProfileDropdown';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeAll } from 'vitest';

// Minimal mocks for Select components (assuming shadcn Select is headless and fine to render)

describe('ProfileDropdown truncation', () => {
    // Base mock; individual tests override as needed
    beforeAll(() => {
        if (!(window as any).matchMedia) {
            (window as any).matchMedia = (q: string) => ({
                matches: false,
                media: q,
                addEventListener: () => { },
                removeEventListener: () => { }
            });
        }
    });
    const baseProfile = { profile_id: 'id1', name: 'ShortName' } as any;
    const longProfile = { profile_id: 'id2', name: 'VeryLongProfileNameExceedingLimit' } as any;

    const noop = () => { };

    function setup(current: any) {
        return render(
            <MemoryRouter>
                <ProfileDropdown
                    profiles={[baseProfile, longProfile]}
                    currentProfile={current}
                    setActiveProfile={noop as any}
                    setProfiles={noop as any}
                />
            </MemoryRouter>
        );
    }

    test('shows full name when length <= 16', () => {
        setup(baseProfile);
        expect(screen.getByTestId('profile-name-full')).toHaveTextContent('ShortName');
        expect(screen.queryByTestId('profile-name-truncated')).toBeNull();
    });

    test('mobile (<768px) uses 16-char truncation', () => {
        // Mock mobile viewport
        (window.matchMedia as any) = (q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } });
        setup(longProfile);
        const truncated = screen.getByTestId('profile-name-truncated');
        expect(truncated).toHaveTextContent(longProfile.name.slice(0, 16) + '…');
    });

    test('tablet/desktop (>=768px) uses 20-char truncation', () => {
        cleanup();
        (window.matchMedia as any) = (q: string) => ({ matches: q === '(min-width: 768px)', media: q, addEventListener: () => { }, removeEventListener: () => { } });
        setup(longProfile);
        const truncated = screen.getByTestId('profile-name-truncated');
        expect(truncated).toHaveTextContent(longProfile.name.slice(0, 20) + '…');
    });
});
