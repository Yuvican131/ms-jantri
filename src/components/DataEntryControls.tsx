"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Undo2, Trash2, FileSpreadsheet, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/hooks/useClients";

interface DataEntryControlsProps {
    clients: Client[];
    selectedClientId: string | null;
    onClientChange: (clientId: string) => void;
    onSave: () => void;
    onRevert: () => void;
    isRevertDisabled: boolean;
    onDataUpdate: (updates: { [key: string]: number | string }, lastEntryString: string) => void;
    onClear: () => void;
    setLastEntry: (entry: string) => void;
    checkBalance: (total: number) => boolean;
    showClientSelectionToast: () => void;
    getClientDisplay: (client: Client) => string;
}

export function DataEntryControls({
    clients,
    selectedClientId,
    onClientChange,
    onSave,
    onRevert,
    isRevertDisabled,
    onDataUpdate,
    onClear,
    setLastEntry,
    checkBalance,
    showClientSelectionToast,
    getClientDisplay,
}: DataEntryControlsProps) {
    const { toast } = useToast();
    const [multiText, setMultiText] = useState("");
    const [laddiNum1, setLaddiNum1] = useState('');
    const [laddiNum2, setLaddiNum2] = useState('');
    const [laddiAmount, setLaddiAmount] = useState('');
    const [removeJodda, setRemoveJodda] = useState(false);
    const [reverseLaddi, setReverseLaddi] = useState(false);
    const [runningLaddi, setRunningLaddi] = useState(false);
    const [harupA, setHarupA] = useState('');
    const [harupB, setHarupB] = useState('');
    const [harupAmount, setHarupAmount] = useState('');
    const [combinationCount, setCombinationCount] = useState(0);
    const [isGeneratedSheetDialogOpen, setIsGeneratedSheetDialogOpen] = useState(false);
    const [generatedSheetContent, setGeneratedSheetContent] = useState("");

    const multiTextRef = useRef<HTMLTextAreaElement>(null);
    const laddiNum1Ref = useRef<HTMLInputElement>(null);
    const laddiNum2Ref = useRef<HTMLInputElement>(null);
    const laddiAmountRef = useRef<HTMLInputElement>(null);
    const harupAInputRef = useRef<HTMLInputElement>(null);
    const harupBInputRef = useRef<HTMLInputElement>(null);
    const harupAmountInputRef = useRef<HTMLInputElement>(null);
    
    const isDataEntryDisabled = !selectedClientId;

    const calculateCombinations = (num1: string, num2: string, removeJoddaFlag: boolean, reverseFlag: boolean, runningFlag: boolean): number => {
        if (runningFlag) {
            const start = parseInt(num1, 10);
            const end = parseInt(num2, 10);
            if (!isNaN(start) && !isNaN(end) && end >= start) {
                return end - start + 1;
            }
            return 0;
        }

        const digits1 = num1.split('');
        const digits2 = num2.split('');
        let combinations = new Set<string>();

        if (digits1.length > 0 && digits2.length > 0) {
            for (const d1 of digits1) {
                for (const d2 of digits2) {
                    if (removeJoddaFlag && d1 === d2) continue;
                    combinations.add(`${d1}${d2}`);
                    if (reverseFlag && d1 !== d2) {
                        combinations.add(`${d2}${d1}`);
                    }
                }
            }
        }
        return combinations.size;
    };

    useEffect(() => {
        const count = calculateCombinations(laddiNum1, laddiNum2, removeJodda, reverseLaddi, runningLaddi);
        setCombinationCount(count);
    }, [laddiNum1, laddiNum2, removeJodda, reverseLaddi, runningLaddi]);
    
    const handleMultiTextApply = () => {
        if (isDataEntryDisabled) {
            showClientSelectionToast();
            return;
        }

        const updates: { [key: string]: number } = {};
        let totalEntryAmount = 0;
        let errorOccurred = false;
        const lines = multiText.trim().split('\n');

        for (const line of lines) {
            if (errorOccurred) break;
            let processed = false;
            let currentLine = line.trim();

            const laddiMatch = currentLine.match(/^(\d+)=(\d+)=(\d+)$/);
            if (laddiMatch) {
                const [, digitsStr, countStr, amountStr] = laddiMatch;
                const uniqueDigits = [...new Set(digitsStr.split(''))];
                const requestedCount = parseInt(countStr, 10);
                const amount = parseInt(amountStr, 10);

                const withJoddaCount = uniqueDigits.length * uniqueDigits.length;
                const withoutJoddaCount = uniqueDigits.length * (uniqueDigits.length - 1);

                if (requestedCount !== withJoddaCount && requestedCount !== withoutJoddaCount) {
                    toast({
                        title: "Wrong Laddi Combination",
                        description: `Input '${digitsStr}' requires ${withoutJoddaCount} or ${withJoddaCount} pairs, but ${requestedCount} were requested.`,
                        variant: "destructive"
                    });
                    errorOccurred = true;
                    continue;
                }

                const combinations = new Set<string>();
                for (const d1 of uniqueDigits) {
                    for (const d2 of uniqueDigits) {
                        if (requestedCount === withoutJoddaCount && d1 === d2) continue;
                        combinations.add(d1 + d2);
                    }
                }

                const laddiTotal = combinations.size * amount;
                if (!checkBalance(laddiTotal)) {
                    errorOccurred = true;
                    continue;
                }
                totalEntryAmount += laddiTotal;
                combinations.forEach(cell => {
                    updates[cell] = (updates[cell] || 0) + amount;
                });
                processed = true;
            }

            if (!processed) {
                currentLine = currentLine.replace(/^[a-zA-Z]+\s*/, '');
                let sanitizedLine = currentLine.replace(/[\s.]+/g, ',');

                const linePatterns = [
                    /((\d{2},)*\d{2}),?\((\d+)\)/g, 
                    /((\d+,)*\d+)\*(\d+)/g, 
                    /((\d+,)*\d+)=+(\d+)/g, 
                    /(\d{2,})=(\d+)/g 
                ];

                let lineHandled = false;
                for (const pattern of linePatterns) {
                    for (const match of sanitizedLine.matchAll(pattern)) {
                        lineHandled = true;
                        const cellsStr = match[1];
                        const amount = parseInt(match[match.length - 1], 10);
                        const cells = cellsStr.split(',').filter(c => c.length === 2);

                        if (isNaN(amount) || cells.length === 0) continue;

                        const entryTotal = cells.length * amount;
                        if (!checkBalance(entryTotal)) {
                            errorOccurred = true;
                            break;
                        }
                        totalEntryAmount += entryTotal;
                        cells.forEach(cell => {
                            updates[cell] = (updates[cell] || 0) + amount;
                        });
                    }
                    if (lineHandled || errorOccurred) break;
                }
            }
        }

        if (errorOccurred) return;

        if (Object.keys(updates).length > 0) {
            onDataUpdate(updates, multiText);
            setMultiText("");
            multiTextRef.current?.focus();
        } else if (multiText.trim().length > 0 && !errorOccurred) {
            toast({
                title: "No valid data found",
                description: "Could not parse the input. Please check the format.",
                variant: "destructive"
            });
        }
    };
    
    const handleLaddiApply = () => {
        if (isDataEntryDisabled) {
            showClientSelectionToast();
            return;
        }
        if ((!laddiNum1 || !laddiNum2) && !runningLaddi || !laddiAmount) {
            toast({ title: "Laddi Error", description: "Please fill all required Laddi fields.", variant: "destructive" });
            return;
        }

        const amountValue = parseFloat(laddiAmount);
        if (isNaN(amountValue)) {
            toast({ title: "Laddi Error", description: "Invalid amount.", variant: "destructive" });
            return;
        }

        const combinations = new Set<string>();

        if (runningLaddi) {
            const start = parseInt(laddiNum1, 10);
            const end = parseInt(laddiNum2, 10);
            if (isNaN(start) || isNaN(end) || start < 0 || end > 99 || start > end) {
                toast({ title: "Running Error", description: "Invalid range. Please enter two-digit numbers (00-99) with start <= end.", variant: "destructive" });
                return;
            }
            for (let i = start; i <= end; i++) {
                combinations.add(i.toString().padStart(2, '0'));
            }
        } else {
            const digits1 = laddiNum1.split('');
            const digits2 = laddiNum2.split('');
            for (const d1 of digits1) {
                for (const d2 of digits2) {
                    if (removeJodda && d1 === d2) continue;
                    combinations.add(`${d1}${d2}`);
                    if (reverseLaddi && d1 !== d2) {
                        combinations.add(`${d2}${d1}`);
                    }
                }
            }
        }

        const entryTotal = combinations.size * amountValue;
        if (!checkBalance(entryTotal)) return;
        
        const updates: { [key: string]: number } = {};
        combinations.forEach(cellNumStr => {
            updates[cellNumStr] = (updates[cellNumStr] || 0) + amountValue;
        });

        if (Object.keys(updates).length > 0) {
            const lastEntryString = `Laddi: ${laddiNum1}x${laddiNum2}=${laddiAmount} (Jodda: ${removeJodda}, Reverse: ${reverseLaddi}, Running: ${runningLaddi})`;
            onDataUpdate(updates, lastEntryString);
            setLaddiNum1('');
            setLaddiNum2('');
            setLaddiAmount('');
            setRemoveJodda(false);
            setReverseLaddi(false);
            setRunningLaddi(false);
            multiTextRef.current?.focus();
        } else {
            toast({ title: "No Laddi Updates", description: "No valid cell combinations found to update.", variant: "destructive" });
        }
    };
    
    const handleHarupApply = () => {
        if (isDataEntryDisabled) {
            showClientSelectionToast();
            return;
        }

        const harupAmountValue = parseFloat(harupAmount);
        if (!harupAmount || isNaN(harupAmountValue)) {
            toast({ title: "HARUP Error", description: "Please provide a valid amount.", variant: "destructive" });
            return;
        }

        const harupADigits = [...new Set(harupA.replace(/[^0-9]/g, '').split(''))];
        const harupBDigits = [...new Set(harupB.replace(/[^0-9]/g, '').split(''))];

        if (harupADigits.length === 0 && harupBDigits.length === 0) {
            toast({ title: "HARUP Error", description: "Please fill HARUP 'A' or 'B' fields.", variant: "destructive" });
            return;
        }

        const entryTotal = (harupADigits.length * harupAmountValue) + (harupBDigits.length * harupAmountValue);
        if (!checkBalance(entryTotal)) return;

        const perDigitAmountA = harupADigits.length > 0 ? harupAmountValue / 10 : 0;
        const perDigitAmountB = harupBDigits.length > 0 ? harupAmountValue / 10 : 0;
        const updates: { [key: string]: number } = {};

        harupADigits.forEach(digitA => {
            for (let i = 0; i < 10; i++) {
                const key = parseInt(`${digitA}${i}`).toString().padStart(2, '0');
                updates[key] = (updates[key] || 0) + perDigitAmountA;
            }
        });

        harupBDigits.forEach(digitB => {
            for (let i = 0; i < 10; i++) {
                const key = parseInt(`${i}${digitB}`).toString().padStart(2, '0');
                updates[key] = (updates[key] || 0) + perDigitAmountB;
            }
        });

        let lastEntryString = "";
        if (harupADigits.length > 0) lastEntryString += `A: ${harupA}=${harupAmount}\n`;
        if (harupBDigits.length > 0) lastEntryString += `B: ${harupB}=${harupAmount}\n`;

        if (Object.keys(updates).length > 0) {
            onDataUpdate(updates, lastEntryString.trim());
            setHarupA('');
            setHarupB('');
            setHarupAmount('');
            multiTextRef.current?.focus();
        } else {
            toast({ title: "No HARUP Updates", description: "No valid cells found to update.", variant: "destructive" });
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>, action?: () => void) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextRef?.current) {
                nextRef.current.focus();
            } else if (action) {
                action();
            }
        }
    };

    const handleMultiTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (isDataEntryDisabled) {
            showClientSelectionToast();
            return;
        }
        const rawValue = e.target.value;
        const formattedLines = rawValue.split('\n').map(line => {
            if ((line.match(/=/g) || []).length > 1) return line;
            const parts = line.split('=');
            if (parts.length === 2) {
                let numbersPart = parts[0].trim();
                const amountPart = parts[1];
                numbersPart = numbersPart.replace(/[\s.]+/g, '').replace(/(\d{2})(?=\d)/g, '$1,');
                return `${numbersPart}=${amountPart}`;
            }
            if (!line.includes('=')) {
                return line.replace(/(\d{2})(?=\d)/g, '$1,');
            }
            return line;
        }).join('\n');
        setMultiText(formattedLines);
    };

    const handleGenerateSheet = () => {
        // This function is defined inside GridSheet, so we'll need to pass the current data
        // For now, this button will be disabled or show a toast.
        // A better approach would be to lift this state up or pass data down.
        toast({ title: "Generate Sheet", description: "This feature is available in the master sheet view for now."})
    };
    
    return (
        <div className="flex flex-col gap-2 w-full min-h-0 lg:w-[320px] xl:w-[360px] flex-shrink-0">
          <div className="border rounded-lg p-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                  <Select value={selectedClientId || 'None'} onValueChange={onClientChange}>
                      <SelectTrigger className="flex-grow h-8 text-xs">
                          <SelectValue>
                            {selectedClientId && clients.find(c => c.id === selectedClientId) ? getClientDisplay(clients.find(c => c.id === selectedClientId)!) : "Select Client"}
                          </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {getClientDisplay(client)}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Button onClick={onSave} disabled={!selectedClientId} size="sm" className="h-8 text-xs">
                      <Save className="h-3 w-3 mr-1" />
                      Save
                  </Button>
                  <Button onClick={onRevert} variant="outline" disabled={isRevertDisabled} size="sm" className="h-8 text-xs">
                      <Undo2 className="h-3 w-3 mr-1" />
                      Revert
                  </Button>
              </div>
          </div>
          <ScrollArea className="flex-grow pr-2 -mr-2">
          <div className="space-y-2 pr-2">
            <div className="border rounded-lg p-2 flex flex-col gap-2">
                <h3 className="font-semibold text-xs mb-1">Multi-Text</h3>
                <Textarea
                    ref={multiTextRef}
                    placeholder="e.g. 12,21=100 or 123=45=10"
                    rows={4}
                    value={multiText}
                    onChange={handleMultiTextChange}
                    onKeyDown={(e) => handleKeyDown(e, undefined, handleMultiTextApply)}
                    className="w-full text-base"
                    disabled={isDataEntryDisabled}
                    onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}
                />
                <div className="flex flex-wrap gap-2 mt-1 items-start">
                    <Button onClick={handleMultiTextApply} className="flex-grow sm:flex-grow-0 text-xs h-8" disabled={isDataEntryDisabled} size="sm">Apply</Button>
                    <Button onClick={handleGenerateSheet} variant="outline" className="flex-grow sm:flex-grow-0 text-xs h-8" disabled={isDataEntryDisabled} size="sm">
                        Generate
                    </Button>
                    <Button onClick={onClear} variant="destructive" className="shrink-0 text-xs h-8" disabled={isDataEntryDisabled} size="sm">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                    </Button>
                </div>
            </div>
            
            <div className="border rounded-lg p-2 flex flex-col gap-2">
              <h3 className="font-semibold mb-1 text-xs">Laddi</h3>
              <div className="flex items-start gap-2 mb-1">
                  <div className="flex-1 flex flex-col items-center gap-1">
                      <Input
                        ref={laddiNum1Ref}
                        id="laddiNum1" type="text" pattern="[0-9]*" className="text-center min-w-0 h-8 text-sm" placeholder={runningLaddi ? "Start" : "Num 1"}
                        value={laddiNum1} onChange={(e) => setLaddiNum1(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={(e) => handleKeyDown(e, laddiNum2Ref)} disabled={isDataEntryDisabled}
                        onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}
                      />
                  </div>
                  <div className="flex flex-col items-center justify-center px-1 pt-1">
                      <div className="text-xs font-bold text-primary">{combinationCount}</div>
                      <span className="font-bold text-center text-sm">x</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                      <Input
                        ref={laddiNum2Ref}
                        id="laddiNum2" type="text" pattern="[0-9]*" className="text-center min-w-0 h-8 text-sm" placeholder={runningLaddi ? "End" : "Num 2"}
                        value={laddiNum2} onChange={(e) => setLaddiNum2(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={(e) => handleKeyDown(e, laddiAmountRef)} disabled={isDataEntryDisabled}
                        onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}
                      />
                  </div>
                  <div className="flex flex-col items-center justify-center px-1 pt-1">
                      <span className="font-bold text-center text-sm">=</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <Input
                      ref={laddiAmountRef}
                      id="laddiAmount" type="text" className="text-center font-bold h-8 text-sm"
                      value={laddiAmount} onChange={(e) => setLaddiAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Amount" onKeyDown={(e) => handleKeyDown(e, undefined, handleLaddiApply)} disabled={isDataEntryDisabled}
                      onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}
                    />
                  </div>
              </div>
              <div className="flex justify-between items-center gap-2 mt-1">
                  <div className="flex items-center gap-x-3">
                      <div className="flex items-center gap-1.5">
                        <Checkbox id="remove-jodda" checked={removeJodda} onCheckedChange={(checked) => { if (isDataEntryDisabled) { showClientSelectionToast(); return; } setRemoveJodda(Boolean(checked)) }} disabled={isDataEntryDisabled || runningLaddi} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                        <Label htmlFor="remove-jodda" className={`text-xs ${isDataEntryDisabled || runningLaddi ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Jodda</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Checkbox id="reverse-laddi" checked={reverseLaddi} onCheckedChange={(checked) => { if (isDataEntryDisabled) { showClientSelectionToast(); return; } setReverseLaddi(Boolean(checked)) }} disabled={isDataEntryDisabled || runningLaddi} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                        <Label htmlFor="reverse-laddi" className={`text-xs ${isDataEntryDisabled || runningLaddi ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Reverse</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Checkbox id="running-laddi" checked={runningLaddi} onCheckedChange={(checked) => { if (isDataEntryDisabled) { showClientSelectionToast(); return; } setRunningLaddi(Boolean(checked)); setLaddiNum1(''); setLaddiNum2(''); }} disabled={isDataEntryDisabled} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                        <Label htmlFor="running-laddi" className={`text-xs ${isDataEntryDisabled ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Running</Label>
                      </div>
                  </div>
                  <Button onClick={handleLaddiApply} disabled={isDataEntryDisabled} size="sm" className="h-8 text-xs">Apply</Button>
              </div>
            </div>
          
            <div className="border rounded-lg p-2 flex flex-col gap-2">
              <h3 className="font-semibold mb-1 text-xs">HARUP</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <div className="flex items-center gap-1">
                    <Label htmlFor="harupA" className="w-6 text-center shrink-0 text-xs">A</Label>
                    <Input ref={harupAInputRef} id="harupA" placeholder="e.g. 123" className="min-w-0 h-8 text-xs" value={harupA} onChange={(e) => setHarupA(e.target.value)} onKeyDown={(e) => handleKeyDown(e, harupBInputRef)} disabled={isDataEntryDisabled} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                </div>
                <div className="flex items-center gap-1">
                    <Label htmlFor="harupB" className="w-6 text-center shrink-0 text-xs">B</Label>
                    <Input ref={harupBInputRef} id="harupB" placeholder="e.g. 456" className="min-w-0 h-8 text-xs" value={harupB} onChange={(e) => setHarupB(e.target.value)} onKeyDown={(e) => handleKeyDown(e, harupAmountInputRef)} disabled={isDataEntryDisabled} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                </div>
              </div>
                <div className="flex items-center gap-2 mt-1">
                  <Label htmlFor="harupAmount" className="w-6 text-center shrink-0 text-xs">=</Label>
                  <Input ref={harupAmountInputRef} id="harupAmount" placeholder="Amount" className="font-bold h-8 text-xs" value={harupAmount} onChange={(e) => setHarupAmount(e.target.value)} onKeyDown={(e) => handleKeyDown(e, undefined, handleHarupApply)} disabled={isDataEntryDisabled} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                  <Button onClick={handleHarupApply} disabled={isDataEntryDisabled} size="sm" className="h-8 text-xs">Apply</Button>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="border rounded-lg p-2 mt-2">
            <Button onClick={() => { /* setIsMasterSheetDialogOpen(true) */ }} variant="outline" className="w-full">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                View Master Sheet
            </Button>
        </div>
      </div>
    );
}
