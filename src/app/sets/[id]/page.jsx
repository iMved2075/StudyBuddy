
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Plus, Trash2, Pencil, Wand2, Loader2, Lightbulb } from 'lucide-react';
import { useFlashcardSets } from '@/hooks/use-flashcard-sets';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAISuggestions } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withAuth } from '@/hooks/use-auth';

function AddEditCardDialog({
  setId,
  cardToEdit,
  onCardAdded,
  onCardUpdated,
  onClose,
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (cardToEdit) {
      setFront(cardToEdit.front);
      setBack(cardToEdit.back);
      setIsDialogOpen(true);
    } else {
      setFront('');
      setBack('');
    }
  }, [cardToEdit]);

  const handleSave = () => {
    if (!front.trim() || !back.trim()) {
      toast({
        variant: 'destructive',
        title: 'Oops!',
        description: 'Both sides of the flashcard must have content.',
      });
      return;
    }
    if (cardToEdit) {
      onCardUpdated({ ...cardToEdit, front, back });
    } else {
      onCardAdded({ front, back });
    }
    handleOpenChange(false);
  };

  const handleOpenChange = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      setFront('');
      setBack('');
      setSuggestions([]);
      onClose();
    }
  };
  
  const fetchAISuggestions = async () => {
    if (!front.trim()) {
      toast({
        variant: 'destructive',
        title: 'Topic needed',
        description: 'Please provide content for the front of the card first.',
      });
      return;
    }
    setIsAISuggesting(true);
    setSuggestions([]);
    const result = await getAISuggestions({ topic: front, existingContent: back });
    if(result.error) {
       toast({
        variant: 'destructive',
        title: 'AI Error',
        description: result.error,
      });
    } else {
       setSuggestions(result.suggestions || []);
    }
    setIsAISuggesting(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {cardToEdit === undefined && (
           <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Card
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{cardToEdit ? 'Edit' : 'Add a New'} Flashcard</DialogTitle>
          <DialogDescription>
            Fill in the front and back of your flashcard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="front">Front</Label>
            <Textarea
              id="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="e.g., What is the capital of Japan?"
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="back">Back</Label>
              <Button variant="ghost" size="sm" onClick={fetchAISuggestions} disabled={isAISuggesting}>
                {isAISuggesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Suggest Content
              </Button>
            </div>
            <Textarea
              id="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="e.g., Tokyo"
              rows={4}
            />
          </div>
          {isAISuggesting && (
            <div className="text-sm text-muted-foreground flex items-center justify-center p-4">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking...
            </div>
          )}
          {suggestions.length > 0 && (
             <div className="grid gap-2 p-2 border rounded-lg bg-secondary/50">
                <h4 className="font-semibold text-sm flex items-center"><Lightbulb className="mr-2 h-4 w-4 text-accent-foreground"/> Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => setBack(s)}>{s}</Button>
                    ))}
                </div>
             </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSave}>Save Card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetDetailPage() {
  const params = useParams();
  const setId = params.id;
  const { addCard, updateCard, deleteCard } = useFlashcardSets();
  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardToEdit, setCardToEdit] = useState(null);
  
  useEffect(() => {
    if (!setId) return;
    const docRef = doc(db, 'flashcard-sets', setId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if(docSnap.exists()){
            const data = docSnap.data();
            setSet({
                id: docSnap.id,
                ...data,
                cards: data.cards || [],
            });
        } else {
            setSet(null);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching set details:", error);
        setLoading(false);
    });

    return () => unsubscribe();
}, [setId]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!set) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p>Set not found.</p>
        <Button asChild variant="link">
          <Link href="/">Go back to sets</Link>
        </Button>
      </div>
    );
  }
  
  const handleEditClick = (card) => {
    setCardToEdit(card);
  };

  const handleUpdateCard = async (card) => {
    await updateCard(setId, card);
  };

  const handleDeleteCard = async (cardId) => {
    await deleteCard(setId, cardId);
  };
  
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sets
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{set.title}</h1>
              <p className="text-muted-foreground mt-1">{set.description}</p>
            </div>
            <div className="flex gap-2">
                <AddEditCardDialog 
                  setId={setId} 
                  onCardAdded={(cardData) => addCard(setId, cardData)} 
                  onCardUpdated={handleUpdateCard}
                  onClose={() => setCardToEdit(null)}
                />
                {cardToEdit && (
                  <AddEditCardDialog 
                    setId={setId} 
                    cardToEdit={cardToEdit} 
                    onCardAdded={(c) => {}} 
                    onCardUpdated={handleUpdateCard}
                    onClose={() => setCardToEdit(null)}
                  />
                )}
                <Button asChild variant="secondary" disabled={!set.cards || set.cards.length === 0}>
                  <Link href={`/sets/${setId}/study`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Study this Set
                  </Link>
                </Button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {set.cards && set.cards.length > 0 ? set.cards.map(card => (
              <Card key={card.id}>
                <CardContent className="p-4 flex justify-between items-start gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <p className="font-medium pr-4 border-r-0 md:border-r"><strong className="text-muted-foreground font-normal block md:hidden">Front:</strong> {card.front}</p>
                    <p className="text-muted-foreground"><strong className="text-muted-foreground font-normal block md:hidden">Back:</strong> {card.back}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(card)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this flashcard. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCard(card.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No cards yet!</h3>
                <p className="text-muted-foreground mt-2">Add a card to start building your set.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(SetDetailPage);
