import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
}

interface VoiceSettings {
  host_voice_id: string;
  expert_voice_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface VoiceCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceSettings: VoiceSettings;
  onVoiceSettingsChange: (settings: VoiceSettings) => void;
}

const AVAILABLE_VOICES: Voice[] = [
  {
    voice_id: "BWGwF36RwZsLxWHtzZ3e",
    name: "Keiron Welch",
    category: "Male",
    description: "Soft, Inspiring"
  },
  {
    voice_id: "4VhEioWwLzhlRxXpucCZ",
    name: "Leon",
    category: "Male",
    description: "Warm, Articulate"
  },
  {
    voice_id: "sScFwemjGrAkDDiTXWMH",
    name: "Kelly",
    category: "Female",
    description: "All American, Casual"
  },
  {
    voice_id: "GsjQ0ydx7QzhDLqInGtT",
    name: "Olivia J",
    category: "Female",
    description: "British, Audiobooks"
  }
];

export default function VoiceCustomizationModal({ 
  isOpen, 
  onClose, 
  voiceSettings, 
  onVoiceSettingsChange 
}: VoiceCustomizationModalProps) {
  const [localSettings, setLocalSettings] = useState<VoiceSettings>(voiceSettings);

  if (!isOpen) return null;

  const handleSave = () => {
    onVoiceSettingsChange(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(voiceSettings); // Reset to original
    onClose();
  };

  const updateSetting = (key: keyof VoiceSettings, value: string | number | boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const getVoiceName = (voiceId: string) => {
    const voice = AVAILABLE_VOICES.find(v => v.voice_id === voiceId);
    return voice ? voice.name : 'Unknown Voice';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-blue-700/70 backdrop-blur-lg border border-blue-200/30 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl scrollbar-thin">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Voice Settings
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-lg p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Voice Selection */}
        <div className="space-y-6">
          
          {/* Host Voice */}
          <div className="rounded-xl bg-indigo-900/30 p-4 shadow-inner">
            <label className="flex items-center gap-2 text-white font-semibold mb-3">
              🎙️ Host Voice
            </label>
            <Select 
              value={localSettings.host_voice_id} 
              onValueChange={(value) => updateSetting('host_voice_id', value)}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 h-16 px-4 text-left">
                <SelectValue placeholder="Select host voice">
                  {localSettings.host_voice_id && (
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-white">{getVoiceName(localSettings.host_voice_id)}</span>
                      <span className="text-sm text-gray-300">{AVAILABLE_VOICES.find(v => v.voice_id === localSettings.host_voice_id)?.category} • {AVAILABLE_VOICES.find(v => v.voice_id === localSettings.host_voice_id)?.description}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-blue-900/95 backdrop-blur-md border-blue-200/30 max-h-[250px] overflow-y-auto scrollbar-thin">
                {AVAILABLE_VOICES.map((voice) => (
                  <SelectItem 
                    key={voice.voice_id} 
                    value={voice.voice_id}
                    className="text-white hover:bg-indigo-600 focus:bg-indigo-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 px-3 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{voice.name}</span>
                        <span className="text-sm text-gray-300">{voice.category} • {voice.description}</span>
                      </div>
                      {localSettings.host_voice_id === voice.voice_id && (
                        <div className="flex items-center justify-center ml-3">
                          <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-blue-200 text-sm mt-2">
              Current: {getVoiceName(localSettings.host_voice_id)}
            </p>
          </div>

          <hr className="my-4 border-gray-700" />

          {/* Expert Voice */}
          <div className="rounded-xl bg-indigo-900/30 p-4 shadow-inner">
            <label className="flex items-center gap-2 text-white font-semibold mb-3">
              👤 Expert Voice
            </label>
            <Select 
              value={localSettings.expert_voice_id} 
              onValueChange={(value) => updateSetting('expert_voice_id', value)}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 h-16 px-4 text-left">
                <SelectValue placeholder="Select expert voice">
                  {localSettings.expert_voice_id && (
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-white">{getVoiceName(localSettings.expert_voice_id)}</span>
                      <span className="text-sm text-gray-300">{AVAILABLE_VOICES.find(v => v.voice_id === localSettings.expert_voice_id)?.category} • {AVAILABLE_VOICES.find(v => v.voice_id === localSettings.expert_voice_id)?.description}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-blue-900/95 backdrop-blur-md border-blue-200/30 max-h-[250px] overflow-y-auto scrollbar-thin">
                {AVAILABLE_VOICES.map((voice) => (
                  <SelectItem 
                    key={voice.voice_id} 
                    value={voice.voice_id}
                    className="text-white hover:bg-indigo-600 focus:bg-indigo-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 px-3 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{voice.name}</span>
                        <span className="text-sm text-gray-300">{voice.category} • {voice.description}</span>
                      </div>
                      {localSettings.expert_voice_id === voice.voice_id && (
                        <div className="flex items-center justify-center ml-3">
                          <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-blue-200 text-sm mt-2">
              Current: {getVoiceName(localSettings.expert_voice_id)}
            </p>
          </div>

          <hr className="my-4 border-gray-700" />

          {/* Voice Quality Settings */}
          <div className="rounded-xl bg-indigo-900/30 p-4 shadow-inner">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              🎛️ Voice Quality Settings
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              
              {/* Stability */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white text-sm font-medium">Stability</label>
                  <span className="text-blue-200 text-sm">{Math.round(localSettings.stability * 100)}%</span>
                </div>
                <Slider
                  value={[localSettings.stability]}
                  onValueChange={([value]) => updateSetting('stability', value)}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-gray-400 mt-1">Higher values = more consistent voice</p>
              </div>

              {/* Similarity Boost */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white text-sm font-medium">Similarity Boost</label>
                  <span className="text-blue-200 text-sm">{Math.round(localSettings.similarity_boost * 100)}%</span>
                </div>
                <Slider
                  value={[localSettings.similarity_boost]}
                  onValueChange={([value]) => updateSetting('similarity_boost', value)}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-gray-400 mt-1">Higher values = closer to original voice</p>
              </div>

              {/* Style */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-white text-sm font-medium">Style</label>
                  <span className="text-blue-200 text-sm">{Math.round(localSettings.style * 100)}%</span>
                </div>
                <Slider
                  value={[localSettings.style]}
                  onValueChange={([value]) => updateSetting('style', value)}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-gray-400 mt-1">Higher values = more emotional expression</p>
              </div>

              {/* Speaker Boost */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white text-sm font-medium">Speaker Boost</label>
                  <p className="text-sm text-gray-400">Enhance voice clarity and presence</p>
                </div>
                <button
                  onClick={() => updateSetting('use_speaker_boost', !localSettings.use_speaker_boost)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    localSettings.use_speaker_boost ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSettings.use_speaker_boost ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Voice Summary */}
        <div className="mt-4 px-4 py-2 bg-indigo-800 text-white rounded text-sm">
          🎙️ Host: {getVoiceName(localSettings.host_voice_id)} | 👤 Expert: {getVoiceName(localSettings.expert_voice_id)}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
} 