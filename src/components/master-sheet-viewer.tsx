
"use client"
import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SavedSheetInfo } from "@/app/page";
import { Eye } from "lucide-react"

const GRID_ROWS = 10;
const GRID_COLS = 10;

type CellData = { [key: string]: string }

type MasterSheetViewerProps = {
    savedSheetLog: SavedSheetInfo[];
    draw: string;
}


const SavedSheetViewerDialog = ({ log, isOpen, onClose }: { log: SavedSheetInfo | null, isOpen: boolean, onClose: () => void }) => {
  if (!log) return null;

  const calculateRowTotal = (rowIndex: number, data: CellData) => {
    let total = 0;
    for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
        const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
        total += parseFloat(data[key]) || 0;
    }
    return total.toString();
  };

  const grandTotal = Object.values(log.data).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Viewing Sheet for {log.clientName}</DialogTitle>
          <DialogDescription>
            Draw: {log.clientName} | Total: ₹{log.gameTotal.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
           <div className="grid gap-0.5 w-full" style={{gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))`}}>
            {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => (
              <React.Fragment key={`row-${rowIndex}`}>
                {Array.from({ length: GRID_COLS }).map((_, colIndex) => {
                  const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
                  const value = log.data[key];
                  return (
                    <div key={key} className="relative flex items-center border border-white rounded-sm aspect-square">
                      <div className="absolute top-1 left-1.5 text-xs text-white select-none pointer-events-none z-10">{key}</div>
                      <Input
                        readOnly
                        type="text"
                        style={{ fontSize: 'clamp(0.8rem, 1.6vh, 1.1rem)'}}
                        className={`p-0 h-full w-full text-center border-0 focus:ring-0 bg-transparent font-bold text-white`}
                        value={value || ''}
                      />
                    </div>
                  );
                })}
                <div className="flex items-center justify-center p-2 font-medium bg-transparent border border-white text-white rounded-sm">
                  {calculateRowTotal(rowIndex, log.data)}
                </div>
              </React.Fragment>
            ))}
             <div className="col-span-10 flex items-center justify-end p-2 font-bold text-white pr-4">Grand Total:</div>
              <div className="flex items-center justify-center p-2 font-bold bg-transparent border border-white text-white rounded-sm">
                {grandTotal.toFixed(2)}
              </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function MasterSheetViewer({ savedSheetLog, draw }: MasterSheetViewerProps) {
    const { toast } = useToast()
    const [masterSheetData, setMasterSheetData] = useState<CellData>({});
    const [cuttingValue, setCuttingValue] = useState("");
    const [lessValue, setLessValue] = useState("");
    const [dabbaValue, setDabbaValue] = useState("");
    const [selectedLogIndices, setSelectedLogIndices] = useState<number[]>([]);
    const [viewingLog, setViewingLog] = useState<SavedSheetInfo | null>(null);

    useEffect(() => {
        // When the log changes, select all logs by default.
        setSelectedLogIndices(savedSheetLog.map((_, index) => index));
    }, [savedSheetLog]);

    useEffect(() => {
        // Recalculate master sheet data when selected logs change
        const newMasterData: CellData = {};
        selectedLogIndices.forEach(index => {
        const logEntry = savedSheetLog[index];
        if (logEntry) {
            Object.entries(logEntry.data).forEach(([key, value]) => {
            const numericValue = parseFloat(value) || 0;
            newMasterData[key] = String((parseFloat(newMasterData[key]) || 0) + numericValue);
            });
        }
        });
        setMasterSheetData(newMasterData);
    }, [selectedLogIndices, savedSheetLog]);

    const calculateRowTotal = (rowIndex: number, data: CellData) => {
        let total = 0;
        for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
            const cellNumber = rowIndex * GRID_COLS + colIndex;
            const key = cellNumber.toString().padStart(2, '0');
            const value = data[key];
            if (value && !isNaN(Number(value))) {
                total += Number(value);
            }
        }
        return total;
    };

    const calculateGrandTotal = (data: CellData) => {
        let total = 0;
        Object.values(data).forEach(value => {
            if (value && !isNaN(Number(value))) {
                total += Number(value);
            }
        });
        return total;
    };
    
    const handleApplyCutting = () => {
        const cutValue = parseFloat(cuttingValue);
        if (isNaN(cutValue)) {
            toast({ title: "Invalid Input", description: "Please enter a valid number for cutting.", variant: "destructive" });
            return;
        }

        const newMasterData = { ...masterSheetData };
        Object.keys(newMasterData).forEach(key => {
            const cellValue = parseFloat(newMasterData[key]) || 0;
            newMasterData[key] = String(cellValue - cutValue);
        });
        setMasterSheetData(newMasterData);

        toast({ title: "Cutting Applied", description: `Subtracted ${cutValue} from all cells in the master sheet.` });
        setCuttingValue("");
    };

    const handleApplyLess = () => {
        const lessPercent = parseFloat(lessValue);
        if (isNaN(lessPercent) || lessPercent < 0 || lessPercent > 100) {
            toast({ title: "Invalid Input", description: "Please enter a valid percentage (0-100) for Less.", variant: "destructive" });
            return;
        }

        const newMasterData = { ...masterSheetData };
        Object.keys(newMasterData).forEach(key => {
            const cellValue = parseFloat(newMasterData[key]) || 0;
            if (cellValue !== 0) {
                const reduction = cellValue * (lessPercent / 100);
                newMasterData[key] = String(cellValue - reduction);
            }
        });
        setMasterSheetData(newMasterData);

        toast({ title: "Less Applied", description: `Subtracted ${lessPercent}% from all cells in the master sheet.` });
        setLessValue("");
    };

    const handleLogSelectionChange = (index: number) => {
        setSelectedLogIndices(prev => 
            prev.includes(index) 
            ? prev.filter(i => i !== index) 
            : [...prev, index]
        );
    };

    const masterSheetRowTotal = (rowIndex: number) => {
        return calculateRowTotal(rowIndex, masterSheetData).toString();
    };

    const masterSheetGrandTotal = () => {
        return calculateGrandTotal(masterSheetData);
    };

    if (!draw) {
        return (
            <Card className="h-full flex items-center justify-center">
                <CardContent className="p-6 text-center">
                    <CardTitle>No Draw Selected</CardTitle>
                    <CardDescription className="mt-2">Please go to the Home tab and select a draw to view the master sheet.</CardDescription>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="h-full flex flex-col gap-4">
            <Card className="flex-grow">
                <CardHeader>
                    <CardTitle>Master Sheet - {draw}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-400px)]">
                        <div className="grid gap-1 w-full pr-4" style={{ gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))` }}>
                            {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => (
                                <React.Fragment key={`master-row-${rowIndex}`}>
                                    {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                                        const cellNumber = rowIndex * GRID_COLS + colIndex;
                                        const displayCellNumber = String(cellNumber).padStart(2, '0');
                                        const key = displayCellNumber;
                                        return (
                                            <div key={`master-cell-${key}`} className="relative">
                                                <div className="absolute top-0.5 left-1 text-xs text-muted-foreground select-none pointer-events-none z-10">{displayCellNumber}</div>
                                                <Input
                                                    type="text"
                                                    readOnly
                                                    className="pt-4 text-center bg-muted min-w-0"
                                                    value={masterSheetData[key] || ''}
                                                    aria-label={`Cell ${displayCellNumber}`}
                                                />
                                            </div>
                                        )
                                    })}
                                    <div className="flex items-center justify-center p-2 font-medium rounded-md">
                                        <Input
                                            type="text"
                                            readOnly
                                            className="text-sm font-medium text-center bg-muted min-w-0"
                                            value={masterSheetRowTotal(rowIndex)}
                                            aria-label={`Row ${rowIndex} Total`}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
                            <div style={{ gridColumn: `span ${GRID_COLS}` }} className="flex items-center justify-end p-2 font-bold mt-1 pr-4">Total</div>
                            <div className="flex items-center justify-center p-2 font-bold bg-primary/20 rounded-md mt-1">
                                {masterSheetGrandTotal()}
                            </div>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                     <div className="flex flex-col sm:flex-row justify-around gap-4 items-end">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="master-cutting" className="text-sm">Cutting</Label>
                            <Input id="master-cutting" placeholder="Value" className="text-sm text-center w-24" value={cuttingValue} onChange={(e) => setCuttingValue(e.target.value)} />
                            <Button onClick={handleApplyCutting} size="sm">Apply</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="master-less" className="text-sm">Less (%)</Label>
                            <Input id="master-less" placeholder="Value" className="text-sm text-center w-24" value={lessValue} onChange={(e) => setLessValue(e.target.value)} />
                            <Button onClick={handleApplyLess} size="sm">Apply</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="master-dabba" className="text-sm">Dabba</Label>
                            <Input id="master-dabba" placeholder="Value" className="text-sm text-center w-24" />
                            <Button size="sm">Apply</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Saved Sheets Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {savedSheetLog.length > 0 ? (
                        savedSheetLog.map((log, index) => (
                          <div key={index} className="flex justify-between items-center p-2 rounded-md bg-muted/50 text-sm">
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                  id={`log-${index}`} 
                                  checked={selectedLogIndices.includes(index)}
                                  onCheckedChange={() => handleLogSelectionChange(index)}
                                />
                                <label htmlFor={`log-${index}`} className="cursor-pointer">{index + 1}. {log.clientName}</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewingLog(log)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <span className="font-mono font-semibold w-24 text-right">₹{log.gameTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground p-2">No sheets have been saved for this draw yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
            </Card>
             <SavedSheetViewerDialog
                log={viewingLog}
                isOpen={!!viewingLog}
                onClose={() => setViewingLog(null)}
            />
        </div>
    )
}
