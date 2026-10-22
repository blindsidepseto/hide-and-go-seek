import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SetupCard from './component';

describe('SetupCard', () => {
  it('Given the setup card, then sizes 8 to 15 are offered with 8 selected', () => {
    render(<SetupCard onStart={jest.fn()} onCancel={jest.fn()} ready />);
    const select = screen.getByLabelText('Grid size') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['8', '9', '10', '11', '12', '13', '14', '15']);
    expect(select.value).toBe('8');
  });

  it('Given the setup card, then it is titled Hide and Go Seek', () => {
    render(<SetupCard onStart={jest.fn()} onCancel={jest.fn()} ready />);
    expect(screen.getByRole('dialog', { name: 'Hide and Go Seek' })).toBeTruthy();
  });

  it('Given a chosen size, when Start is clicked, then onStart gets that size', () => {
    const onStart = jest.fn();
    render(<SetupCard onStart={onStart} onCancel={jest.fn()} ready />);
    fireEvent.change(screen.getByLabelText('Grid size'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    expect(onStart).toHaveBeenCalledWith(12);
  });

  it('Given the meeting user list has not loaded yet, then Start is disabled', () => {
    const onStart = jest.fn();
    render(<SetupCard onStart={onStart} onCancel={jest.fn()} ready={false} />);
    const start = screen.getByRole('button', { name: 'Loading participants…' }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
  });

  it('When Cancel is clicked, then onCancel is called', () => {
    const onCancel = jest.fn();
    render(<SetupCard onStart={jest.fn()} onCancel={onCancel} ready />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
