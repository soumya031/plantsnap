/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import AntiGravityLanding from './components/AntiGravityLanding';
import PlantIdentifier from './components/PlantIdentifier';
import PlantCard from './components/PlantCard';
import { Leaf, User, LogOut, LayoutGrid, Camera, Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut, db, collection, onSnapshot, query, orderBy, doc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'identify' | 'garden' | 'profile'>('identify');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        // Sync user profile to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          lastLogin: serverTimestamp(),
        }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        });

        // Listen for plants
        const plantsQuery = query(
          collection(db, `users/${currentUser.uid}/plants`),
          orderBy('addedAt', 'desc')
        );
        
        const unsubPlants = onSnapshot(plantsQuery, (snapshot) => {
          const plantList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPlants(plantList);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/plants`);
        });

        return () => unsubPlants();
      } else {
        setPlants([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveTab('identify');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!started) {
    return <AntiGravityLanding onStart={() => setStarted(true)} />;
  }

  return (
    <div className="min-h-screen bg-emerald-50/50 pb-24 md:pb-0 md:pt-20">
      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-emerald-100 items-center justify-between px-8 z-50">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-2xl">
          <Leaf className="w-8 h-8" />
          PlantSnap
        </div>
        <nav className="flex items-center gap-8">
          <button 
            onClick={() => setActiveTab('identify')}
            className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'identify' ? 'text-emerald-600' : 'text-emerald-400 hover:text-emerald-500'}`}
          >
            <Camera className="w-5 h-5" /> Identify
          </button>
          <button 
            onClick={() => setActiveTab('garden')}
            className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'garden' ? 'text-emerald-600' : 'text-emerald-400 hover:text-emerald-500'}`}
          >
            <LayoutGrid className="w-5 h-5" /> My Garden
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'profile' ? 'text-emerald-600' : 'text-emerald-400 hover:text-emerald-500'}`}
          >
            <User className="w-5 h-5" /> Profile
          </button>
        </nav>
        {user ? (
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full font-bold hover:bg-emerald-200 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        ) : (
          <button 
            onClick={handleSignIn}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all shadow-md"
          >
            Sign In
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-4">
        {activeTab === 'identify' && <PlantIdentifier />}
        
        {activeTab === 'garden' && (
          <div>
            {!user ? (
              <div className="text-center py-20 bg-white rounded-3xl shadow-xl border border-emerald-100 max-w-md mx-auto px-6">
                <User className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-emerald-900">Sign In Required</h2>
                <p className="text-emerald-600 mt-2 mb-6">You need to sign in to view and manage your garden.</p>
                <button 
                  onClick={handleSignIn}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  Sign In with Google
                </button>
              </div>
            ) : plants.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {plants.map(plant => (
                  <PlantCard key={plant.id} plant={plant} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <LayoutGrid className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-emerald-900">Your Garden is Empty</h2>
                <p className="text-emerald-600 mt-2">Start identifying plants to add them to your collection.</p>
                <button 
                  onClick={() => setActiveTab('identify')}
                  className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all"
                >
                  Identify Now
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 text-center">
            {user ? (
              <>
                <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-emerald-100">
                  <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-full h-full object-cover" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-900">{user.displayName}</h2>
                <p className="text-emerald-600 mb-6">{user.email}</p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Plants</p>
                    <p className="text-2xl font-bold text-emerald-900">{plants.length}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Badges</p>
                    <p className="text-2xl font-bold text-emerald-900">1</p>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="w-12 h-12 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-900">Guest User</h2>
                <p className="text-emerald-600 mb-6">Sign in to sync your garden across devices.</p>
                <button 
                  onClick={handleSignIn}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  Sign In with Google
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-emerald-100 flex items-center justify-around px-4 z-50">
        <button 
          onClick={() => setActiveTab('identify')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'identify' ? 'text-emerald-600' : 'text-emerald-400'}`}
        >
          <Camera className="w-6 h-6" />
          <span className="text-xs font-bold">Identify</span>
        </button>
        <button 
          onClick={() => setActiveTab('garden')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'garden' ? 'text-emerald-600' : 'text-emerald-400'}`}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-xs font-bold">Garden</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-emerald-600' : 'text-emerald-400'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-bold">Profile</span>
        </button>
      </nav>
    </div>
  );
}



