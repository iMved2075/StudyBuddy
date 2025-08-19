
'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, FileUp, FileDown, Trash2, BrainCircuit, Loader2 } from 'lucide-react';
import { useFlashcardSets } from '@/hooks/use-flashcard-sets';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { withAuth } from '@/hooks/use-auth';

function HomePage() {
  const { sets, addSet, deleteSet, importSets, loading, getSet } = useFlashcardSets();
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleCreateSet = () => {
    if (newSetTitle.trim()) {
      addSet({
        title: newSetTitle,
        description: newSetDescription,
      });
      setNewSetTitle('');
      setNewSetDescription('');
      setIsDialogOpen(false);
    }
  };

  const handleExport = async (setId) => {
    const setToExport = await getSet(setId);
    if (!setToExport || !setToExport.cards) {
        toast({
            variant: "destructive",
            title: "Export failed",
            description: "Could not fetch the set for export."
        });
        return;
    }
    const headers = ['front', 'back'];
    const rows = setToExport.cards.map((card) =>
      `"${card.front.replace(/"/g, '""')}","${card.back.replace(/"/g, '""')}"`
    );
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeTitle = setToExport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${safeTitle}_flashcards.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Exported!',
      description: `Set "${setToExport.title}" has been exported.`,
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        try {
          importSets(text, file.name.replace(/\.csv$/, ''));
        } catch (error) {
           toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: 'Could not parse the CSV file. Please check the format.',
          });
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    if(event.target) {
        event.target.value = '';
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">My Flashcard Sets</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImportClick}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileImport}
              accept=".csv"
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Set
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create a New Flashcard Set</DialogTitle>
                  <DialogDescription>
                    Give your new set a title and a description to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={newSetTitle}
                      onChange={(e) => setNewSetTitle(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Spanish Vocabulary"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newSetDescription}
                      onChange={(e) => setNewSetDescription(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Chapter 1 basics"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                     <Button type="button" variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleCreateSet}>
                    Create Set
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sets.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sets.map((set) => (
              <Card key={set.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate">{set.title}</CardTitle>
                  <CardDescription className="line-clamp-2 h-[40px]">
                    {set.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">
                    {set.cardCount} card{set.cardCount !== 1 && 's'}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExport(set.id)}
                    >
                      <FileDown className="h-4 w-4" />
                       <span className="sr-only">Export</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the set "{set.title}" and all its cards. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSet(set.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Button asChild>
                    <Link href={`/sets/${set.id}`}>View Set</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <BrainCircuit className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-2xl font-bold tracking-tight">
                No sets yet!
              </h3>
              <p className="text-sm text-muted-foreground">
                Get started by creating a new flashcard set.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default withAuth(HomePage);
