import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

function ElementRow({ el, index, total, scoringType, onChange, onRemove, onMove }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-5 text-center font-mono">{index + 1}</span>
        <input
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder={scoringType === 'ingame' ? 'Category name (e.g. City, Road)' : 'Element name (e.g. Eggs)'}
          value={el.name}
          onChange={(e) => onChange(index, 'name', e.target.value)}
        />
        {scoringType === 'ingame' && (
          <input
            type="number"
            inputMode="numeric"
            className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="pts"
            min="0"
            value={el.point_value ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              onChange(index, 'point_value', v);
            }}
          />
        )}
        <button
          onClick={() => onRemove(index)}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2 pl-7">
        <input
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Description or scoring rule (optional)"
          value={el.description || ''}
          onChange={(e) => onChange(index, 'description', e.target.value)}
        />
        <div className="flex gap-1">
          <button
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
          >↑</button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
          >↓</button>
        </div>
      </div>
    </div>
  );
}

export default function GameEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scoringType, setScoringType] = useState('endgame');
  const [isShared, setIsShared] = useState(false);
  const [elements, setElements] = useState([{ name: '', description: '', point_value: null }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    api.getGame(id).then((g) => {
      setName(g.name);
      setDescription(g.description || '');
      setScoringType(g.scoring_type || 'endgame');
      setIsShared(g.is_shared || false);
      setElements(g.elements.length > 0 ? g.elements : [{ name: '', description: '', point_value: null }]);
    });
  }, [id]);

  function addElement() {
    setElements((prev) => [...prev, { name: '', description: '', point_value: null }]);
  }

  function removeElement(i) {
    setElements((prev) => prev.filter((_, idx) => idx !== i));
  }

  function changeElement(i, field, value) {
    setElements((prev) => prev.map((el, idx) => idx === i ? { ...el, [field]: value } : el));
  }

  function moveElement(i, dir) {
    setElements((prev) => {
      const next = [...prev];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) return setError('Score card name is required');
    const validElements = elements.filter((e) => e.name.trim());

    setSaving(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        scoring_type: scoringType,
        is_shared: isShared,
        elements: validElements,
      };
      if (isEdit) {
        await api.updateGame(id, data);
      } else {
        await api.createGame(data);
      }
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const isIngame = scoringType === 'ingame';

  return (
    <div className="p-4">
      <header className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Score Card' : 'New Score Card'}</h1>
      </header>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Score Card Name</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. Wingspan, Catan, Ticket to Ride"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Scoring type toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Scoring Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setScoringType('endgame')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                !isIngame ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'
              }`}
            >
              <p className={`font-semibold text-sm ${!isIngame ? 'text-sky-800' : 'text-gray-700'}`}>
                Final Tally
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Score each category once at the end (Wingspan, Terraforming Mars)
              </p>
            </button>
            <button
              onClick={() => setScoringType('ingame')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isIngame ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'
              }`}
            >
              <p className={`font-semibold text-sm ${isIngame ? 'text-sky-800' : 'text-gray-700'}`}>
                Live Running
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Add points during scoring (Carcassonne, Scrabble, Yahtzee)
              </p>
            </button>
          </div>
        </div>

        {/* Share toggle */}
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700">Share with library</p>
            <p className="text-xs text-gray-400 mt-0.5">All users can see and score this score card</p>
          </div>
          <button
            type="button"
            onClick={() => setIsShared(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isShared ? 'bg-sky-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isShared ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Elements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {isIngame ? 'Quick-Score Categories' : 'Scoring Elements'}
            </label>
            {isIngame && (
              <span className="text-xs text-gray-400">pts = fixed value (blank = ask)</span>
            )}
            {!isIngame && (
              <span className="text-xs text-gray-400">Listed in scoring order</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {elements.map((el, i) => (
              <ElementRow
                key={i}
                el={el}
                index={i}
                total={elements.length}
                scoringType={scoringType}
                onChange={changeElement}
                onRemove={removeElement}
                onMove={moveElement}
              />
            ))}
          </div>
          <button
            onClick={addElement}
            className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 transition-colors"
          >
            + Add {isIngame ? 'category' : 'scoring element'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Score Card'}
        </button>
      </div>
    </div>
  );
}
