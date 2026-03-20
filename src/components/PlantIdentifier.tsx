import React, { useState, useRef } from 'react';
import { Camera, Loader2, Leaf, AlertCircle, RefreshCw, Save, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { auth, db, storage, ref, uploadString, getDownloadURL, doc, setDoc, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';

interface PlantInfo {
  commonName: string;
  scientificName: string;
  family: string;
  sunlight: string;
  wateringFrequency: string;
  wateringDays: number;
  soilType: string;
  difficulty: string;
  toxicity: {
    pets: boolean;
    children: boolean;
    details: string;
  };
  careInstructions: string[];
  funFact: string;
}

const PlantIdentifier: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<PlantInfo | null>(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        identifyPlant(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const identifyPlant = async (base64Image: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const base64Data = base64Image.split(',')[1];

      const prompt = `You are a botanist. Identify the plant in this image and return a JSON object with these fields:
- commonName
- scientificName
- family
- sunlight (one of: "full sun", "partial shade", "full shade")
- wateringFrequency (e.g., "every 3-4 days")
- wateringDays (a single integer representing the average days between watering, e.g., 3)
- soilType
- difficulty (one of: "beginner", "intermediate", "expert")
- toxicity (object with: pets: boolean, children: boolean, details: string)
- careInstructions (array of 3-5 strings)
- funFact (one interesting fact)

If you cannot identify the plant, return { "error": "Could not identify", "suggestions": ["possible match 1", "possible match 2"] }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const data = JSON.parse(response.text || '{}');
      
      if (data.error) {
        setError(data.error + (data.suggestions ? `: ${data.suggestions.join(', ')}` : ''));
      } else {
        setResult(data as PlantInfo);
        setNickname(data.commonName);
      }
    } catch (err: any) {
      console.error('Identification error:', err);
      const errStr = JSON.stringify(err);
      if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        setError('The AI botanist is currently busy (quota exceeded). Please wait a minute and try again.');
      } else {
        setError('Failed to identify plant. Please try again with a clearer photo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToGarden = async () => {
    if (!result || !image || !auth.currentUser) return;
    setSaving(true);
    setError(null);

    try {
      const userId = auth.currentUser.uid;
      const plantId = `plant_${Date.now()}`;
      const path = `users/${userId}/plants/${plantId}`;
      
      // 1. Upload image to Storage
      const storageRef = ref(storage, `plants/${userId}/${plantId}.jpg`);
      await uploadString(storageRef, image, 'data_url');
      const photoURL = await getDownloadURL(storageRef);

      // 2. Save to Firestore
      const plantData = {
        ...result,
        photoURL,
        nickname: nickname || result.commonName,
        notes: '',
        addedAt: serverTimestamp(),
        lastWatered: serverTimestamp(),
        wateringLog: [new Date().toISOString()]
      };

      await setDoc(doc(db, `users/${userId}/plants`, plantId), plantData);
      setSaved(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}/plants`);
      setError('Failed to save plant to your garden. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100">
        <div className="p-8 bg-emerald-600 text-white text-center">
          <h2 className="text-3xl font-bold mb-2">Identify a Plant</h2>
          <p className="opacity-90">Snap a photo or upload an image to get instant care advice.</p>
        </div>

        <div className="p-8">
          {!image ? (
            <div className="flex flex-col items-center justify-center border-4 border-dashed border-emerald-100 rounded-3xl p-12 bg-emerald-50/30">
              <Leaf className="w-16 h-16 text-emerald-300 mb-6" />
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo / Upload
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="mt-4 text-emerald-600/60 text-sm">Supports JPG, PNG, WEBP</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="relative group max-w-md mx-auto">
                <img
                  src={image}
                  alt="Captured plant"
                  className="w-full h-64 object-cover rounded-2xl shadow-lg border-4 border-white"
                />
                <button
                  onClick={() => { setImage(null); setResult(null); setError(null); setSaved(false); }}
                  className="absolute top-4 right-4 p-2 bg-white/90 text-emerald-600 rounded-full shadow-md hover:bg-white transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-bold text-lg animate-pulse">Our botanist is analyzing your plant...</p>
                </div>
              )}

              {error && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-700">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="font-bold">Identification Failed</h3>
                    <p>{error}</p>
                    <button 
                      onClick={() => setImage(null)}
                      className="mt-2 text-sm font-bold underline"
                    >
                      Try another photo
                    </button>
                  </div>
                </div>
              )}

              {result && (
                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-4xl font-bold text-emerald-900">{result.commonName}</h3>
                      <p className="text-xl italic text-emerald-600">{result.scientificName}</p>
                      <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                        {result.family}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-xs uppercase font-bold text-amber-600 mb-1">Sunlight</p>
                        <p className="font-bold text-amber-900">{result.sunlight}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-xs uppercase font-bold text-blue-600 mb-1">Watering</p>
                        <p className="font-bold text-blue-900">{result.wateringFrequency}</p>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <p className="text-xs uppercase font-bold text-stone-600 mb-1">Soil</p>
                        <p className="font-bold text-stone-900">{result.soilType}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                        <p className="text-xs uppercase font-bold text-purple-600 mb-1">Difficulty</p>
                        <p className="font-bold text-purple-900 capitalize">{result.difficulty}</p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${result.toxicity.pets || result.toxicity.children ? 'bg-red-50 border-red-100 text-red-900' : 'bg-green-50 border-green-100 text-green-900'}`}>
                      <p className="text-xs uppercase font-bold mb-1">Toxicity</p>
                      <p className="font-bold">
                        {result.toxicity.pets || result.toxicity.children ? '⚠️ Warning' : '✅ Safe'}
                      </p>
                      <p className="text-sm opacity-80">{result.toxicity.details}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                      <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                        <Leaf className="w-5 h-5" />
                        Care Instructions
                      </h4>
                      <ul className="space-y-3">
                        {result.careInstructions.map((step, i) => (
                          <li key={i} className="flex gap-3 text-emerald-800">
                            <span className="flex-shrink-0 w-6 h-6 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <h4 className="font-bold text-indigo-900 mb-2">Fun Fact</h4>
                      <p className="text-indigo-800 italic">"{result.funFact}"</p>
                    </div>

                    <div className="space-y-4">
                      <label className="block">
                        <span className="text-sm font-bold text-emerald-900 block mb-2">Give it a nickname</span>
                        <input 
                          type="text" 
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="e.g. Spike, Leafy, My Fern"
                          className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                      </label>

                      {auth.currentUser ? (
                        <button 
                          onClick={saveToGarden}
                          disabled={saving || saved}
                          className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                          {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : saved ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                          {saving ? 'Saving...' : saved ? 'Saved to Garden' : 'Save to My Garden'}
                        </button>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-sm text-center font-medium">
                          Sign in to save this plant to your collection.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlantIdentifier;

