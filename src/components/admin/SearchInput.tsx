type SearchInputProps = {
  placeholder: string;
  label?: string;
};

export default function SearchInput({ placeholder, label = "Search" }: SearchInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="search"
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}
