
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
  getDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';

const SETS_COLLECTION = 'flashcard-sets';

export function useFlashcardSets() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, SETS_COLLECTION),
      where('ownerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const setsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          setsData.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            cardCount: data.cards?.length || 0,
            createdAt: data.createdAt.toDate().toISOString(),
          });
        });
        setSets(setsData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching sets:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch flashcard sets.',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast, user]);

  const getSet = useCallback(async (id) => {
    if (!user) return null;
    try {
      const docRef = doc(db, SETS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().ownerId === user.uid) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      } else {
        console.log("No such document or insufficient permissions!");
        return null;
      }
    } catch (error) {
      console.error("Error getting document:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch the flashcard set.',
      });
      return null;
    }
  }, [toast, user]);

  const addSet = useCallback(async (newSetData) => {
    if (!user) return;
    try {
      const docData = {
        ...newSetData,
        ownerId: user.uid,
        cards: [],
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, SETS_COLLECTION), docData);
      toast({
        title: 'Success!',
        description: 'Your new flashcard set has been created.',
      });
    } catch (error)      {
      console.error('Error adding set:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not create the new set.',
      });
    }
  }, [toast, user]);

  const deleteSet = useCallback(async (id) => {
    if (!user) return;
    const setToDelete = sets.find((s) => s.id === id);
    if (!setToDelete) return;
    try {
      const setDoc = await getDoc(doc(db, SETS_COLLECTION, id));
      if (setDoc.exists() && setDoc.data().ownerId === user.uid) {
        await deleteDoc(doc(db, SETS_COLLECTION, id));
        toast({
          title: 'Set Deleted',
          description: `The set "${setToDelete.title}" has been removed.`,
        });
      } else {
         throw new Error("Permission denied");
      }
    } catch (error) {
      console.error('Error deleting set:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the set.',
      });
    }
  }, [sets, toast, user]);
  
  const addCard = useCallback(async (setId, cardData) => {
    if (!user) return;
    const newCard = {
      ...cardData,
      id: Date.now().toString(),
    };
    try {
       const setDoc = await getDoc(doc(db, SETS_COLLECTION, setId));
       if (setDoc.exists() && setDoc.data().ownerId === user.uid) {
          await updateDoc(doc(db, SETS_COLLECTION, setId), {
            cards: arrayUnion(newCard),
          });
          toast({ title: 'Success', description: 'New flashcard added.' });
       } else {
         throw new Error("Permission denied");
      }
    } catch (error) {
      console.error('Error adding card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the new card.',
      });
    }
  }, [toast, user]);

  const updateCard = useCallback(async (setId, updatedCard) => {
    if (!user) return;
    const setDocRef = doc(db, SETS_COLLECTION, setId);
    const setDoc = await getDoc(setDocRef);
    if (!setDoc.exists() || setDoc.data().ownerId !== user.uid) {
        toast({ variant: 'destructive', title: 'Error', description: 'Permission denied.' });
        return;
    }
    
    const set = setDoc.data();
    const cardIndex = set.cards.findIndex(c => c.id === updatedCard.id);
    if (cardIndex === -1) return;
    
    const updatedCards = [...set.cards];
    updatedCards[cardIndex] = updatedCard;

    try {
      await updateDoc(setDocRef, {
        cards: updatedCards
      });
       toast({ title: 'Success', description: 'Flashcard updated.' });
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update the flashcard.',
      });
    }
  }, [toast, user]);


  const deleteCard = useCallback(async (setId, cardId) => {
    if (!user) return;
    const setDocRef = doc(db, SETS_COLLECTION, setId);
    const setDoc = await getDoc(setDocRef);
    if (!setDoc.exists() || setDoc.data().ownerId !== user.uid) {
         toast({ variant: 'destructive', title: 'Error', description: 'Permission denied.' });
         return;
    }
    
    const set = setDoc.data();
    const cardToDelete = set.cards.find(c => c.id === cardId);
    if (!cardToDelete) return;

    try {
      await updateDoc(setDocRef, {
        cards: arrayRemove(cardToDelete),
      });
       toast({ title: 'Card Deleted', description: 'The card has been removed.' });
    } catch (error) {
      console.error('Error deleting card:', error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the card.',
      });
    }
  }, [toast, user]);
  
  const importSets = useCallback(async (csvString, fileName) => {
    if (!user) return;
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
        toast({ variant: 'destructive', title: 'Import Failed', description: 'CSV has no data rows.' });
        return;
    }

    const headers = lines.shift().toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const frontIndex = headers.indexOf('front');
    const backIndex = headers.indexOf('back');

    if (frontIndex === -1 || backIndex === -1) {
      toast({ variant: 'destructive', title: 'Import Failed', description: "CSV must have 'front' and 'back' columns." });
      return;
    }
    
    const cards = lines.map((line, index) => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        return {
            id: `${Date.now()}-${index}`,
            front: (values[frontIndex] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'),
            back: (values[backIndex] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"')
        }
    });

    const newSet = {
        title: fileName,
        description: `Imported from ${fileName}.csv`,
        cards: cards,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
    };
    
    try {
        await addDoc(collection(db, SETS_COLLECTION), newSet);
        toast({
            title: 'Import Successful!',
            description: `Flashcards from "${fileName}.csv" have been imported.`,
        });
    } catch (error) {
        console.error("Error importing set:", error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'Could not save the new set to the database.',
        });
    }
  }, [toast, user]);


  return { loading, sets, getSet, addSet, deleteSet, addCard, updateCard, deleteCard, importSets };
}
