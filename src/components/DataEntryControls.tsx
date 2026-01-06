
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
import { formatNumber } from "@/lib/utils";

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
    focusMultiText: () => void;
    openMasterSheet: () => void;
    currentGridData: { [key: string]: string };
    draw: string;
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
    focusMultiText,
    openMasterSheet,
    currentGridData,
    draw,
}: DataEntryControls) {
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

    useEffect(() => {
        if(focusMultiText) {
            focusMultiText();
        }
    }, [focusMultiText]);

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

    const handleMultiTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
    
        // If the new value is shorter, it's a deletion, so just update the state
        if (newValue.length < multiText.length) {
            setMultiText(newValue);
            return;
        }
    
        // Don't auto-format if it's a multi-line paste or contains special chars
        if (newValue.includes('\n') || newValue.match(/[=()_*x]/i)) {
            setMultiText(newValue);
            return;
        }
    
        let rawNumbers = newValue.replace(/[^0-9]/g, '');
        if (rawNumbers.length > 0) {
            let formatted = rawNumbers.match(/.{1,2}/g)?.join(',') + (rawNumbers.length % 2 === 1 ? '' : ',');
             // Only add trailing comma if length is even and it's not empty
            if (rawNumbers.length % 2 === 0 && rawNumbers.length > 0) {
                formatted += ',';
            }
            setMultiText(formatted);
        } else {
            setMultiText('');
        }
    };
    
    const handleMultiTextApply = () => {
        if (isDataEntryDisabled) {
            showClientSelectionToast();
            return;
        }
        if (!multiText.trim()) return;
    
        const finalUpdates: { [key: string]: number } = {};
        let totalForCheck = 0;
    
        function parseFinalUniversalData(text: string) {
            const result: { value?: number, amount?: number | null, crossing?: number, combination?: number, runningPair?: string }[] = [];
            const groups = text.split(/\s+/).filter(g => g.trim() !== "");

            groups.forEach(group => {
                const amountMatch = group.match(/\((\d+)\)/) 
                                 || group.match(/[\*x=](\d+)/i)
                                 || group.match(/(?<![a-zA-Z0-9])(\d+)$/);

                const amount = amountMatch ? Number(amountMatch[1]) : null;
        
                let cleaned = group;
                if (amountMatch) {
                     cleaned = cleaned.substring(0, amountMatch.index).trim();
                }
                
                if (cleaned.endsWith(',')) cleaned = cleaned.slice(0,-1);

                cleaned = cleaned.replace(/ghar/gi, "");

                const runningPairMatch = cleaned.match(/(\d+)_(\d+)/);
                if (runningPairMatch) {
                    result.push({ runningPair: runningPairMatch[0], amount });
                    return;
                }

                const parts = cleaned.split('_').filter(p => p);
                
                parts.forEach(part => {
                    const tokens = part.split(/[,.\s\/]+/).map(t => t.trim()).filter(t => t !== "");
                    let activeCrossing: number | null = null;
        
                    tokens.forEach((token, index) => {
                        if (!token) return;
        
                        if (index === 0 && token.length >= 3 && !amount) {
                            activeCrossing = Number(token);
                            result.push({ crossing: activeCrossing });
                        } else if (token.length > 2 && !activeCrossing) {
                            for (let i = 0; i < token.length; i += 2) {
                                if(token.slice(i, i + 2).length === 2) {
                                    const pair = Number(token.slice(i, i + 2));
                                    result.push({ value: pair, amount });
                                }
                            }
                        } else {
                            const num = Number(token);
                            if (activeCrossing) {
                                result.push({ combination: num, amount });
                                activeCrossing = null; 
                            } else {
                                result.push({ value: num, amount });
                            }
                        }
                    });
                });
            });
        
            return result;
        }

        const parsedData = parseFinalUniversalData(multiText);
        
        let activeCrossing: number | null = null;

        parsedData.forEach(item => {
            if (item.crossing) {
                activeCrossing = item.crossing;
            } else if (item.runningPair) {
                 const [startStr, endStr] = item.runningPair.split('_');
                 const startDigits = [...new Set(startStr.split(''))];
                 const endDigits = [...new Set(endStr.split(''))];
                 const amount = item.amount || 0;
                 const combinations = new Set<string>();
                 for (const d1 of startDigits) {
                     for (const d2 of endDigits) {
                         if (d1 !== d2) {
                            combinations.add(`${d1}${d2}`);
                            combinations.add(`${d2}${d1}`);
                         } else {
                            combinations.add(`${d1}${d2}`);
                         }
                     }
                 }
                 const entryTotal = combinations.size * amount;
                 totalForCheck += entryTotal;
                 combinations.forEach(pair => {
                     const key = pair.padStart(2, '0');
                     finalUpdates[key] = (finalUpdates[key] || 0) + amount;
                 });

            } else if (item.combination && activeCrossing) {
                const crossingDigits = [...new Set(String(activeCrossing).split(''))];
                const combinationDigits = [...new Set(String(item.combination).split(''))];
                const amount = item.amount || 0;
                
                const combinations = new Set<string>();
                for (const d1 of crossingDigits) {
                    for (const d2 of combinationDigits) {
                        if (d1 !== d2) {
                           combinations.add(`${d1}${d2}`);
                           combinations.add(`${d2}${d1}`);
                        } else {
                           combinations.add(`${d1}${d2}`);
                        }
                    }
                }
                const entryTotal = combinations.size * amount;
                totalForCheck += entryTotal;
                
                combinations.forEach(pair => {
                    const key = pair.padStart(2, '0');
                    finalUpdates[key] = (finalUpdates[key] || 0) + amount;
                });
                activeCrossing = null;
            } else if (item.value !== undefined && item.amount !== null && !isNaN(item.value)) {
                if(String(item.value).length > 2) {
                     const valueStr = String(item.value);
                     for (let i = 0; i < valueStr.length; i += 2) {
                        if(valueStr.slice(i, i + 2).length === 2) {
                            const key = valueStr.slice(i, i + 2);
                            const amount = item.amount;
                            totalForCheck += amount;
                            finalUpdates[key] = (finalUpdates[key] || 0) + amount;
                        }
                    }
                } else {
                    const key = String(item.value).padStart(2, '0');
                    const amount = item.amount;
                    totalForCheck += amount;
                    finalUpdates[key] = (finalUpdates[key] || 0) + amount;
                }
            }
        });


        if (!checkBalance(totalForCheck)) {
            return;
        }

        if (Object.keys(finalUpdates).length > 0) {
            onDataUpdate(finalUpdates, multiText);
            setMultiText("");
            focusMultiText();
        } else {
            toast({ title: "No data processed", description: "Could not find valid number/amount pairs.", variant: "destructive" });
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
            if (isNaN(start) || isNaN(end) || start < 1 || end > 100 || start > end) {
                toast({ title: "Running Error", description: "Invalid range. Please enter numbers between 1 and 100 with start <= end.", variant: "destructive" });
                return;
            }
            for (let i = start; i <= end; i++) {
                const numStr = i.toString().padStart(2, '0');
                combinations.add(numStr);
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
            const numAsInt = parseInt(cellNumStr, 10);
            const dataKey = numAsInt === 100 ? '00' : cellNumStr.padStart(2, '0');
            updates[dataKey] = (updates[dataKey] || 0) + amountValue;
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
            focusMultiText();
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
                const cellNumber = parseInt(`${digitA}${i}`, 10);
                if (cellNumber === 0) continue; // Skip 00 for 'A' harup
                const key = cellNumber === 100 ? '00' : cellNumber.toString().padStart(2, '0');
                updates[key] = (updates[key] || 0) + perDigitAmountA;
            }
        });

        harupBDigits.forEach(digitB => {
            for (let i = 0; i < 10; i++) {
                const cellNumber = parseInt(`${i}${digitB}`, 10);
                if (cellNumber === 0) continue; // Skip 00 for 'B' harup
                const key = cellNumber === 100 ? '00' : cellNumber.toString().padStart(2, '0');
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
            focusMultiText();
        } else {
            toast({ title: "No HARUP Updates", description: "No valid cells found to update.", variant: "destructive" });
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent, from: string) => {
        if (e.key === 'Enter') {
             if (e.shiftKey && from === 'multiText') {
                return;
             }
            e.preventDefault();
            switch (from) {
                case 'laddiNum1':
                    laddiNum2Ref.current?.focus();
                    break;
                case 'laddiNum2':
                    laddiAmountRef.current?.focus();
                    break;
                case 'laddiAmount':
                    handleLaddiApply();
                    break;
                case 'harupA':
                    harupBInputRef.current?.focus();
                    break;
                case 'harupB':
                    harupAmountInputRef.current?.focus();
                    break;
                case 'harupAmount':
                    handleHarupApply();
                    break;
                case 'multiText':
                    if (multiText.includes('=') || multiText.includes('*') || multiText.includes('(') || multiText.includes('x') || (/\d$/.test(multiText) && multiText.split(/[,.\s\/]+/).filter(t => t).length > 1) ) {
                        handleMultiTextApply();
                    } else if (multiText.trim() !== '') {
                        setMultiText(prev => prev.trim().endsWith(',') ? prev.trim() + '=' : prev.trim() + ',');
                    }
                    break;
            }
        }
    };
    
    const handleGenerateSheet = () => {
        if (isDataEntryDisabled) {
            showClientSelectionToast();
            return;
        }

        const valueToCells: { [value: string]: string[] } = {};

        for (let i = 1; i <= 100; i++) {
            const displayKey = i.toString().padStart(2, '0');
            const dataKey = i === 100 ? '00' : displayKey;
            const value = currentGridData[dataKey];
            if (value && value.trim() !== '' && !isNaN(Number(value)) && Number(value) !== 0) {
                if (!valueToCells[value]) {
                    valueToCells[value] = [];
                }
                valueToCells[value].push(displayKey);
            }
        }
        
        const sheetBody = Object.entries(valueToCells)
            .map(([value, cells]) => {
                cells.sort((a, b) => parseInt(a) - parseInt(b));
                return `${cells.join(',')}=${value}`;
            })
            .join('\n');

        const grandTotal = Object.values(currentGridData).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
        const totalString = `Total = ${formatNumber(grandTotal)}`;

        const fullContent = `${draw}\n${sheetBody}\n\n${totalString}`;

        setGeneratedSheetContent(fullContent);
        setIsGeneratedSheetDialogOpen(true);
        toast({ title: "Client Sheet Generated", description: "The content has been generated based on the current grid." });
    };

    const handleCopyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            toast({ title: "Copied to clipboard!" });
        }, (err) => {
            toast({ title: "Failed to copy", description: "Could not copy text to clipboard.", variant: "destructive" });
            console.error('Failed to copy: ', err);
        });
    };
    
    return (
        <>
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
                    <h3 className="font-semibold text-xs mb-1">Multi-Text Entry</h3>
                    <Textarea
                        ref={multiTextRef}
                        placeholder="e.g. 11,22,33=100 or 11,22(100) or 123*10"
                        rows={4}
                        value={multiText}
                        onChange={handleMultiTextChange}
                        onKeyDown={(e) => handleKeyDown(e, 'multiText')}
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
                            value={laddiNum1} onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setLaddiNum1(val);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, 'laddiNum1')} 
                            disabled={isDataEntryDisabled}
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
                            value={laddiNum2} onChange={(e) => setLaddiNum2(e.target.value.replace(/[^0-9]/g, ''))} 
                            onKeyDown={(e) => handleKeyDown(e, 'laddiNum2')} 
                            disabled={isDataEntryDisabled}
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
                          placeholder="Amount" 
                          onKeyDown={(e) => handleKeyDown(e, 'laddiAmount')} 
                          disabled={isDataEntryDisabled}
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
                        <Input ref={harupAInputRef} id="harupA" placeholder="e.g. 123" className="min-w-0 h-8 text-xs" value={harupA} onChange={(e) => setHarupA(e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, 'harupA')} 
                        disabled={isDataEntryDisabled} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                    </div>
                    <div className="flex items-center gap-1">
                        <Label htmlFor="harupB" className="w-6 text-center shrink-0 text-xs">B</Label>
                        <Input ref={harupBInputRef} id="harupB" placeholder="e.g. 456" className="min-w-0 h-8 text-xs" value={harupB} onChange={(e) => setHarupB(e.target.value)} 
                        onKeyDown={(e) => handleKeyDown(e, 'harupB')} 
                        disabled={isDataEntryDisabled} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                    </div>
                  </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Label htmlFor="harupAmount" className="w-6 text-center shrink-0 text-xs">=</Label>
                      <Input ref={harupAmountInputRef} id="harupAmount" placeholder="Amount" className="font-bold h-8 text-xs" value={harupAmount} onChange={(e) => setHarupAmount(e.target.value)} 
                      onKeyDown={(e) => handleKeyDown(e, 'harupAmount')} 
                      disabled={isDataEntryDisabled} onClick={isDataEntryDisabled ? showClientSelectionToast : undefined}/>
                      <Button onClick={handleHarupApply} disabled={isDataEntryDisabled} size="sm" className="h-8 text-xs">Apply</Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="border rounded-lg p-2 mt-2">
                <Button onClick={openMasterSheet} variant="outline" className="w-full">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    View Master Sheet
                </Button>
            </div>
          </div>
            <Dialog open={isGeneratedSheetDialogOpen} onOpenChange={setIsGeneratedSheetDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generated Client Sheet Content</DialogTitle>
                </DialogHeader>
                <div className="my-4">
                  <Textarea
                    readOnly
                    value={generatedSheetContent}
                    rows={Math.min(15, generatedSheetContent.split('\n').length)}
                    className="bg-muted"
                  />
                </div>
                <DialogFooter className="sm:justify-between">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
                  <Button onClick={() => handleCopyToClipboard(generatedSheetContent)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
    );

    
    

    



    

    
