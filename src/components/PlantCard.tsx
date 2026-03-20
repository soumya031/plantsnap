import React, { useState } from 'react';
import { Droplets, Sun, Info, MessageCircle, Calendar, ChevronRight, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import CareChat from './CareChat';
import { auth, db, doc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { deleteDoc } from 'firebase/firestore';

interface PlantCardProps {
  plant: any;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [watering, setWatering] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Calculate if plant needs water
  const isThirsty = (() => {
    if (!plant.lastWatered) return true;
    const lastWateredDate = plant.lastWatered.toDate();
    const wateringDays = plant.wateringDays || 7; // Default to 7 if missing
    const nextWateringDate = new Date(lastWateredDate);
    nextWateringDate.setDate(lastWateredDate.getDate() + wateringDays);
    return new Date() > nextWateringDate;
  })();

  const handleWaterNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    setWatering(true);
    try {
      const plantRef = doc(db, `users/${auth.currentUser.uid}/plants`, plant.id);
      const newLog = [...(plant.wateringLog || []), new Date().toISOString()];
      await setDoc(plantRef, {
        lastWatered: serverTimestamp(),
        wateringLog: newLog
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}/plants/${plant.id}`);
    } finally {
      setWatering(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser || !window.confirm('Are you sure you want to remove this plant from your garden?')) return;
    setDeleting(true);
    try {
      const plantRef = doc(db, `users/${auth.currentUser.uid}/plants`, plant.id);
      await deleteDoc(plantRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser.uid}/plants/${plant.id}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div 
        onClick={() => setShowDetails(true)}
        className="group bg-white rounded-3xl shadow-md hover:shadow-xl transition-all border border-emerald-100 overflow-hidden cursor-pointer active:scale-[0.98]"
      >
        <div className="relative h-48 overflow-hidden">
          <img 
            src={plant.photoURL} 
            alt={plant.nickname} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {isThirsty && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1 animate-bounce">
              <Droplets className="w-3 h-3" />
              THIRSTY
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <p className="text-white text-sm font-bold flex items-center gap-1">
              View Details <ChevronRight className="w-4 h-4" />
            </p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="text-lg font-bold text-emerald-900 truncate">{plant.nickname}</h3>
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-emerald-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-emerald-600 italic truncate mb-3">{plant.scientificName}</p>
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1 text-amber-600">
                <Sun className="w-3 h-3" />
                {plant.sunlight}
              </div>
              <div className="flex items-center gap-1 text-blue-600">
                <Droplets className="w-3 h-3" />
                {plant.wateringFrequency}
              </div>
            </div>
            <button 
              onClick={handleWaterNow}
              disabled={watering}
              className={`p-2 rounded-full transition-all active:scale-90 shadow-sm ${
                isThirsty 
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse ring-4 ring-red-100' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title={isThirsty ? "NEEDS WATER NOW!" : "Mark as watered"}
            >
              {watering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Droplets className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="relative h-64 shrink-0">
              <img src={plant.photoURL} alt={plant.nickname} className="w-full h-full object-cover" />
              <button 
                onClick={() => setShowDetails(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 text-emerald-900 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-4xl font-bold text-emerald-900">{plant.nickname}</h2>
                  <p className="text-xl italic text-emerald-600">{plant.scientificName}</p>
                </div>
                <button 
                  onClick={() => setShowChat(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md"
                >
                  <MessageCircle className="w-5 h-5" />
                  Care Assistant
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <Sun className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-[10px] uppercase font-bold text-amber-600">Sunlight</p>
                  <p className="text-sm font-bold text-amber-900">{plant.sunlight}</p>
                </div>
                <div className={`p-3 rounded-2xl border text-center relative group/water transition-all ${
                  isThirsty ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'
                }`}>
                  <Droplets className={`w-5 h-5 mx-auto mb-1 ${isThirsty ? 'text-red-600' : 'text-blue-600'}`} />
                  <p className={`text-[10px] uppercase font-bold ${isThirsty ? 'text-red-600' : 'text-blue-600'}`}>Water</p>
                  <p className={`text-sm font-bold ${isThirsty ? 'text-red-900' : 'text-blue-900'}`}>{plant.wateringFrequency}</p>
                  <button 
                    onClick={handleWaterNow}
                    disabled={watering}
                    className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-md opacity-0 group-hover/water:opacity-100 transition-opacity ${
                      isThirsty ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {watering ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  </button>
                </div>
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                  <Info className="w-5 h-5 text-stone-600 mx-auto mb-1" />
                  <p className="text-[10px] uppercase font-bold text-stone-600">Difficulty</p>
                  <p className="text-sm font-bold text-stone-900 capitalize">{plant.difficulty}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <Calendar className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Last Watered</p>
                  <p className="text-sm font-bold text-emerald-900">
                    {plant.lastWatered?.toDate().toLocaleDateString() || 'Never'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-900 mb-3">Care Instructions</h4>
                  <ul className="space-y-2">
                    {plant.careInstructions.map((step: string, i: number) => (
                      <li key={i} className="flex gap-3 text-emerald-800 text-sm">
                        <span className="shrink-0 w-5 h-5 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-1">Fun Fact</h4>
                  <p className="text-indigo-800 text-sm italic">"{plant.funFact}"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
        <CareChat 
          plant={plant} 
          onClose={() => setShowChat(false)} 
        />
      )}
    </>
  );
};

export default PlantCard;
