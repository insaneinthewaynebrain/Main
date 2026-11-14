import type { Tool } from '../tools/registry';

interface Props {
  tools: Tool[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function TabBar({ tools, activeId, onSelect }: Props) {
  return (
    <nav className="tabbar" aria-label="Tools">
      {tools.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tab${id === activeId ? ' tab--active' : ''}`}
          aria-current={id === activeId ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
