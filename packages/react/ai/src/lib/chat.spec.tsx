import { StrictMode, createRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type {
  OgeAiRequest,
  OgeAiTransport,
  OgeChatMessage,
} from '@oge-ui/behavior';
import { OgeAiConfigProvider } from './ai-config';
import { OgeChat, type OgeChatHandle } from './chat';

class ManualTransport implements OgeAiTransport {
  readonly requests: OgeAiRequest[] = [];
  private release: ((text: string) => void)[] = [];
  complete(request: OgeAiRequest) {
    this.requests.push(request);
    return new Promise<{ text: string }>((resolve) => {
      this.release.push((text) => resolve({ text }));
    });
  }
  async reply(text: string): Promise<void> {
    await act(async () => {
      this.release.shift()?.(text);
    });
  }
}

function Controlled({ transport }: { transport: OgeAiTransport }) {
  const [history, setHistory] = useState<readonly OgeChatMessage[]>([]);
  return (
    <>
      <OgeChat
        transport={transport}
        instructions="You are the Acme bot."
        suggestions={['Where is my order?']}
        conversation={history}
        onConversationChange={setHistory}
      />
      <output data-testid="count">{history.length}</output>
    </>
  );
}

describe('<OgeChat>', () => {
  it('sends with Enter, shows the typing indicator and renders replies as text — controlled, under StrictMode', async () => {
    const transport = new ManualTransport();
    const { container } = render(
      <StrictMode>
        <Controlled transport={transport} />
      </StrictMode>,
    );
    expect(screen.getByRole('group', { name: 'Chat' })).toHaveClass('oge-chat');
    expect(screen.getByRole('log', { name: 'Conversation' })).toHaveAttribute(
      'aria-live',
      'polite',
    );
    const field = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(field, { target: { value: 'Hello <b>there</b>' } });
    await act(async () => {
      fireEvent.keyDown(field, { key: 'Enter' });
    });
    expect(transport.requests[0].messages[0].content).toContain(
      'You are the Acme bot.',
    );
    expect(container.querySelector('.oge-chat-typing')).not.toBeNull();
    await transport.reply('Hi! <script>x</script>');
    const bubbles = [...container.querySelectorAll('.oge-chat-bubble')].map(
      (b) => b.textContent?.trim(),
    );
    expect(bubbles).toEqual([
      'You: Hello <b>there</b>',
      'Assistant: Hi! <script>x</script>',
    ]);
    expect(container.querySelector('b, script')).toBeNull();
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('manual mode through the handle, and a suggestion chip sends at once', async () => {
    const transport = new ManualTransport();
    const handle = createRef<OgeChatHandle>();
    render(
      <OgeAiConfigProvider config={{ transport }}>
        <OgeChat ref={handle} transport={null} suggestions={['Hi']} />
      </OgeAiConfigProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hi' }));
    });
    expect(transport.requests).toHaveLength(0);
    act(() => {
      handle.current!.addMessage({ role: 'assistant', text: 'Ayşe here.' });
    });
    expect(screen.getByText('Ayşe here.')).toBeInTheDocument();
  });

  it('server-renders the empty state', () => {
    const html = renderToString(<OgeChat suggestions={['Hi']} />);
    expect(html).toContain('role="log"');
    expect(html).toContain('Start the conversation.');
  });
});
