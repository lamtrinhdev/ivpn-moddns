import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoLogs from '@/pages/logs/NoLogs';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

describe('NoLogs empty state', () => {
    beforeEach(() => {
        navigateMock.mockClear();
    });

    it('renders onboarding empty state with CTA and navigates to setup', () => {
        render(<NoLogs />);

        expect(screen.getByText(/No logs to display/i)).toBeInTheDocument();
        expect(screen.getByText(/Set up modDNS on your devices to start analysing queries\./i)).toBeInTheDocument();

        const setupButton = screen.getByRole('button', { name: /DNS Setup/i });
        expect(setupButton).toBeInTheDocument();

        fireEvent.click(setupButton);
        expect(navigateMock).toHaveBeenCalledWith('/setup');
    });

    it('renders search empty state without CTA when a search is active', () => {
        render(<NoLogs isSearchActive />);

        expect(screen.getByText(/No matching logs/i)).toBeInTheDocument();
        expect(screen.getByText(/No logs match your search/i)).toBeInTheDocument();
        expect(screen.queryByText(/Set up modDNS on your devices/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /DNS Setup/i })).not.toBeInTheDocument();
    });
});
