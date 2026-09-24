type Props = { sources: string[]; selectedSources: string[]; onChange: (sources: string[]) => void };

export function SourceFilter({ sources, selectedSources, onChange }: Props) {
  function toggle(source: string) {
    onChange(selectedSources.includes(source) ? selectedSources.filter((item) => item !== source) : [...selectedSources, source]);
  }

  return <fieldset className="source-filter"><legend>Sources</legend><div className="source-options">
    {sources.map((source) => <label className="source-option" key={source}><input type="checkbox" checked={!selectedSources.length || selectedSources.includes(source)} onChange={() => toggle(source)} /> <span>{source}</span></label>)}
  </div></fieldset>;
}
