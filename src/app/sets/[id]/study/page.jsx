
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFlashcardSets } from '@/hooks/use-flashcard-sets';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Check, RotateCcw, X, BrainCircuit, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { withAuth } from '@/hooks/use-auth';

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function Flashcard({ front, back, isFlipped, onFlip }) {
  return (
    <div className="w-full h-64 md:h-80 [perspective:1000px]" onClick={onFlip}>
      <div
        className={cn(
          'relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d]',
          { '[transform:rotateY(180deg)]': isFlipped }
        )}
      >
        <div className="absolute w-full h-full [backface-visibility:hidden]">
          <Card className="w-full h-full flex items-center justify-center">
            <CardContent className="p-6 text-xl md:text-2xl font-semibold">{front}</CardContent>
          </Card>
        </div>
        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <Card className="w-full h-full flex items-center justify-center">
            <CardContent className="p-6 text-lg md:text-xl text-muted-foreground">{back}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params.id;
  const { getSet } = useFlashcardSets();

  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);

  const [studyQueue, setStudyQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [isSessionOver, setIsSessionOver] = useState(false);
  const [initialCardCount, setInitialCardCount] = useState(0);

  useEffect(() => {
      const fetchSet = async () => {
        setLoading(true);
        const fetchedSet = await getSet(setId);
        setSet(fetchedSet);
        setLoading(false);
      }
      fetchSet();
  },[setId, getSet]);

  const startSession = useCallback(() => {
    if (set && set.cards && set.cards.length > 0) {
      const shuffledCards = shuffleArray(set.cards);
      setStudyQueue(shuffledCards);
      setInitialCardCount(shuffledCards.length);
      setCurrentIndex(0);
      setMasteredCount(0);
      setIsFlipped(false);
      setIsSessionOver(false);
    }
  }, [set]);

  useEffect(() => {
    if (!loading && set) {
      startSession();
    }
  }, [loading, set, startSession]);

  const handleNextCard = (knewIt) => {
    if (knewIt) {
      setMasteredCount(prev => prev + 1);
      const newQueue = studyQueue.filter((_, index) => index !== currentIndex);
      setStudyQueue(newQueue);
      if (newQueue.length === 0) {
        setIsSessionOver(true);
      } else {
        setCurrentIndex(prev => (prev % newQueue.length));
      }
    } else {
       setCurrentIndex(prev => (prev + 1) % studyQueue.length);
    }
    setIsFlipped(false);
  };
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!set) {
    return <div className="flex h-screen items-center justify-center">Set not found.</div>;
  }

  if (!set.cards || set.cards.length === 0) {
    return (
       <div className="flex h-screen flex-col items-center justify-center text-center p-4">
          <BrainCircuit className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">This set is empty!</h2>
          <p className="text-muted-foreground mt-2">Add some cards to this set before you can study it.</p>
          <Button asChild className="mt-6">
            <Link href={`/sets/${setId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Set</Link>
          </Button>
        </div>
    );
  }

  const currentCard = studyQueue[currentIndex];
  const progress = initialCardCount > 0 ? (masteredCount / initialCardCount) * 100 : 0;

  if (isSessionOver) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center p-4">
        <ThumbsUp className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-3xl font-bold">Session Complete!</h2>
        <p className="text-muted-foreground mt-2">You've mastered all the cards in this session.</p>
        <div className="flex gap-4 mt-8">
            <Button onClick={startSession}>
                <RotateCcw className="mr-2 h-4 w-4" /> Study Again
            </Button>
            <Button asChild variant="outline">
                <Link href={`/sets/${setId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set
                </Link>
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-4 md:p-8">
      <header className="flex items-center justify-between mb-4">
        <Button variant="ghost" asChild>
          <Link href={`/sets/${setId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            End Session
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
           {masteredCount} / {initialCardCount} Mastered
        </div>
      </header>
      
      <div className="mb-4">
        <Progress value={progress} />
      </div>

      <main className="flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          {currentCard ? (
            <Flashcard 
              front={currentCard.front}
              back={currentCard.back}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
            />
          ) : (
             !isSessionOver && <div className="flex items-center justify-center h-80">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </div>
      </main>

      <footer className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4">
        <Button variant="outline" className="w-full md:w-auto" onClick={() => handleNextCard(false)} disabled={!currentCard}>
          <RotateCcw className="mr-2 h-4 w-4" /> Review Again
        </Button>
        <Button className="w-full md:w-auto" onClick={() => handleNextCard(true)} disabled={!currentCard}>
          <Check className="mr-2 h-4 w-4" /> I Knew This
        </Button>
      </footer>
    </div>
  );
}

export default withAuth(StudyPage);
