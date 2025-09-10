
"use client"
import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { validateCellContent, ValidateCellContentOutput } from "@/ai/flows/validate-cell-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, Plus, AlertCircle, Loader2, Trash2, Copy, X, Save, RotateCcw, Undo2, Eye, FileSpreadsheet, ArrowLeft } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import type { Client } from "./clients-manager"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SavedSheetInfo } from "@/app/page";
import type { Account } from "./accounts-manager";


type CellData = { [key: string]: string }
type ValidationResult = {
  isValid: boolean
  recommendation: string
}
type CellValidation = { [key: string]: ValidationResult & { isLoading: boolean } }

type Sheet = {
  id: string;
  name: string;
  data: CellData;
  rowTotals: { [key: number]: string };
};

type ClientSheetData = {
  [clientId: string]: {
    data: CellData;
    rowTotals: { [key: number]: string };
  };
};

const initialSheets: Sheet[] = [
  { id: "1", name: "Sheet 1", data: {}, rowTotals: {} },
]

const GRID_ROWS = 10;
const GRID_COLS = 10;
const DUMMY_ACCOUNTS = "Revenue, Expenses, Assets, Liabilities, Equity, COGS"
const DUMMY_RULES = "Cell content must be a number or a standard account name. If it's a number, it can be positive or negative."
const MAX_COMBINATIONS = 100;

type GridSheetHandle = {
  handleClientUpdate: (client: Client) => void;
  clearSheet: () => void;
  getClientData: (clientId: string) => CellData | undefined;
  getClientCurrentData: (clientId: string) => CellData | undefined;
  getClientPreviousData: (clientId: string) => CellData | undefined;
};

type GridSheetProps = {
  draw: string;
  date: Date;
  lastEntry: string;
  setLastEntry: (entry: string) => void;
  isLastEntryDialogOpen: boolean;
  setIsLastEntryDialogOpen: (open: boolean) => void;
  clients: Client[];
  onClientSheetSave: (clientName: string, clientId: string, data: CellData, draw: string) => void;
  savedSheetLog: SavedSheetInfo[];
  accounts: Account[];
  draws: string[];
}

const MasterSheetViewer = ({
  savedSheetLog,
  draw,
}: {
  savedSheetLog: SavedSheetInfo[];
  draw: string;
}) => {
  const { toast } = useToast();
  const [masterSheetData, setMasterSheetData] = useState<CellData>({});
  const [cuttingValue, setCuttingValue] = useState("");
  const [lessValue, setLessValue] = useState("");
  const [dabbaValue, setDabbaValue] = useState("");
  const [selectedLogIndices, setSelectedLogIndices] = useState<number[]>([]);

  useEffect(() => {
    // When the draw or logs change, select all logs by default.
    setSelectedLogIndices(savedSheetLog.map((_, index) => index));
  }, [draw, savedSheetLog]);

  useEffect(() => {
    // Recalculate master sheet data when selected logs or draw change
    const newMasterData: CellData = {};
    const logsToProcess = savedSheetLog || [];
    
    selectedLogIndices.forEach(index => {
      const logEntry = logsToProcess[index];
      if (logEntry) {
        Object.entries(logEntry.data).forEach(([key, value]) => {
          const numericValue = parseFloat(value) || 0;
          newMasterData[key] = String((parseFloat(newMasterData[key]) || 0) + numericValue);
        });
      }
    });
    setMasterSheetData(newMasterData);
  }, [selectedLogIndices, draw, savedSheetLog]);

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
  
  const calculateColumnTotal = (colIndex: number, data: CellData) => {
    let total = 0;
    for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex++) {
      const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
      total += parseFloat(data[key]) || 0;
    }
    return total;
  };

  const calculateGrandTotal = (data: CellData) => {
    return Object.values(data).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
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

  const masterSheetRowTotals = Array.from({ length: GRID_ROWS }, (_, rowIndex) => calculateRowTotal(rowIndex, masterSheetData));
  const masterSheetColumnTotals = Array.from({ length: GRID_COLS }, (_, colIndex) => calculateColumnTotal(colIndex, masterSheetData));
  const masterSheetGrandTotal = calculateGrandTotal(masterSheetData);
  
  return (
    <div className="h-full flex flex-col p-4 pt-0 gap-4 bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 flex-grow overflow-hidden">
            <div className="flex flex-col min-w-0 h-full">
                <div className="grid gap-0.5 w-full flex-grow" style={{gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS + 1}, minmax(0, 1fr))`}}>
                    {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
                        <React.Fragment key={`master-row-${rowIndex}`}>
                            {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                                const key = String(rowIndex * GRID_COLS + colIndex).padStart(2, '0');
                                return (
                                    <div key={`master-cell-${key}`} className="relative flex items-center border border-white rounded-sm">
                                        <div className="absolute top-1 left-1.5 text-xs select-none pointer-events-none z-10 text-white">{key}</div>
                                        <Input
                                            type="text"
                                            readOnly
                                            style={{ fontSize: 'clamp(0.8rem, 1.6vh, 1.1rem)'}}
                                            className="p-0 h-full w-full text-center transition-colors duration-300 border-0 focus:ring-0 bg-transparent font-bold text-white"
                                            value={masterSheetData[key] || ''}
                                            aria-label={`Cell ${key}`}
                                        />
                                    </div>
                                );
                            })}
                            <div className="flex items-center justify-center font-medium border border-white rounded-sm bg-transparent text-white">
                                <Input readOnly value={masterSheetRowTotals[rowIndex]} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent text-white" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 0.9rem)'}}/>
                            </div>
                        </React.Fragment>
                    ))}
                    {Array.from({ length: GRID_COLS }, (_, colIndex) => (
                        <div key={`master-col-total-${colIndex}`} className="flex items-center justify-center font-medium p-0 h-full border border-white rounded-sm bg-transparent text-white">
                            <Input readOnly value={masterSheetColumnTotals[colIndex]} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent text-white" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 0.9rem)'}}/>
                        </div>
                    ))}
                    <div className="flex items-center justify-center font-bold text-lg border border-white rounded-sm text-white">
                        {masterSheetGrandTotal.toFixed(2)}
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-4 w-full lg:w-[320px] xl:w-[360px]">
                <div className="border rounded-lg p-2 flex flex-col gap-2">
                    <h3 className="font-semibold text-xs mb-1">Master Controls</h3>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="master-cutting" className="text-sm text-card-foreground w-16">Cutting</Label>
                            <Input id="master-cutting" placeholder="Value" className="text-sm text-center flex-grow" value={cuttingValue} onChange={(e) => setCuttingValue(e.target.value)} />
                            <Button onClick={handleApplyCutting} size="sm">Apply</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="master-less" className="text-sm text-card-foreground w-16">Less (%)</Label>
                            <Input id="master-less" placeholder="Value" className="text-sm text-center flex-grow" value={lessValue} onChange={(e) => setLessValue(e.target.value)} />
                            <Button onClick={handleApplyLess} size="sm">Apply</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="master-dabba" className="text-sm text-card-foreground w-16">Dabba</Label>
                            <Input id="master-dabba" placeholder="Value" className="text-sm text-center flex-grow" />
                            <Button size="sm">Apply</Button>
                        </div>
                    </div>
                </div>
                <Card className="flex-grow bg-card min-h-0">
                    <CardHeader className="p-2">
                        <CardTitle className="text-sm">Client Entries</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 h-full">
                        <ScrollArea className="h-full">
                            <div className="space-y-1 pr-2">
                                {savedSheetLog.length > 0 ? savedSheetLog.map((log, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 rounded-md bg-muted text-sm">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id={`log-${draw}-${index}`}
                                                checked={selectedLogIndices.includes(index)}
                                                onCheckedChange={() => handleLogSelectionChange(index)}
                                                className="border-primary"
                                            />
                                            <label htmlFor={`log-${draw}-${index}`} className="cursor-pointer text-muted-foreground">{index + 1}. {log.clientName}</label>
                                        </div>
                                        <span className="font-mono font-semibold text-foreground">₹{log.gameTotal.toFixed(2)}</span>
                                    </div>
                                )) : (
                                    <div className="text-center text-muted-foreground italic h-full flex items-center justify-center">No logs for this draw.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
);
}


const GridSheet = forwardRef<GridSheetHandle, GridSheetProps>((props, ref) => {
  const { toast } = useToast()
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets)
  const [activeSheetId, setActiveSheetId] = useState<string>("1")
  const [clientSheetData, setClientSheetData] = useState<ClientSheetData>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isMasterSheetDialogOpen, setIsMasterSheetDialogOpen] = useState(false);

  const [validations, setValidations] = useState<CellValidation>({})
  const [multiText, setMultiText] = useState("");
  const [updatedCells, setUpdatedCells] = useState<string[]>([]);
  const [laddiNum1, setLaddiNum1] = useState('');
  const [laddiNum2, setLaddiNum2] = useState('');
  const [laddiAmount, setLaddiAmount] = useState('');
  const [removeJodda, setRemoveJodda] = useState(false);
  const [reverseLaddi, setReverseLaddi] = useState(false);
  const [runningLaddi, setRunningLaddi] = useState(false);
  const [combinationCount, setCombinationCount] = useState(0);

  const [harupA, setHarupA] = useState('');
  const [harupB, setHarupB] = useState('');
  const [harupAmount, setHarupAmount] = useState('');
  const [isGeneratedSheetDialogOpen, setIsGeneratedSheetDialogOpen] = useState(false);
  const [generatedSheetContent, setGeneratedSheetContent] = useState("");
  
  const [previousSheetState, setPreviousSheetState] = useState<{ data: CellData, rowTotals: { [key: number]: string } } | null>(null);

  
  const activeSheet = sheets.find(s => s.id === activeSheetId)!
  
  const currentData = selectedClientId
    ? clientSheetData[selectedClientId]?.data || {}
    : activeSheet.data;

  const currentRowTotals = selectedClientId
    ? clientSheetData[selectedClientId]?.rowTotals || {}
    : activeSheet.rowTotals;

  const isDataEntryDisabled = !selectedClientId;


  const showClientSelectionToast = () => {
    toast({
      title: "No Client Selected",
      description: "Please select a client to enable data entry.",
      variant: "destructive",
    });
  };

  const updateClientData = (clientId: string, data: CellData, rowTotals: { [key: number]: string }) => {
    setClientSheetData(prev => ({
      ...prev,
      [clientId]: { data, rowTotals }
    }));
  };

  const handleSelectedClientChange = (clientId: string) => {
    if (clientId === "None") {
      setSelectedClientId(null);
    } else {
      setSelectedClientId(clientId);
      if (!clientSheetData[clientId]) {
        updateClientData(clientId, {}, {});
      }
    }
  };

  const saveDataForUndo = () => {
    if (isDataEntryDisabled) return;
    const dataToSave = selectedClientId ? clientSheetData[selectedClientId] : activeSheet;
    setPreviousSheetState({ data: { ...(dataToSave?.data || {}) }, rowTotals: { ...(dataToSave?.rowTotals || {}) } });
  };
  
  const handleRevertLastEntry = () => {
    if (previousSheetState) {
      if (selectedClientId) {
        updateClientData(selectedClientId, previousSheetState.data, previousSheetState.rowTotals);
      } else {
        setSheets(prevSheets => prevSheets.map(sheet =>
          sheet.id === activeSheetId ? { ...sheet, data: previousSheetState.data, rowTotals: previousSheetState.rowTotals } : sheet
        ));
      }
      toast({ title: "Last Entry Reverted", description: "The last change has been undone." });
      setPreviousSheetState(null); // Clear previous state after reverting
    } else {
      toast({ title: "No Entry to Revert", description: "There is no previous action to revert.", variant: "destructive" });
    }
  };

  useImperativeHandle(ref, () => ({
    handleClientUpdate: (client: Client) => {
      if (selectedClientId === null) {
        showClientSelectionToast();
        return;
      }
      if (client.pair === '90') {
        saveDataForUndo();
        const cellNum = parseInt(client.name, 10);
        const commission = parseFloat(client.comm);

        if (!isNaN(cellNum) && cellNum >= 0 && cellNum <= 99 && !isNaN(commission)) {
          const key = (cellNum).toString().padStart(2, '0');
          
          const newData = { ...currentData };
          const currentValue = parseFloat(newData[key]) || 0;
          newData[key] = String(currentValue * commission);

          if(selectedClientId) {
            updateClientData(selectedClientId, newData, currentRowTotals);
          } else {
            setSheets(prevSheets => prevSheets.map(sheet => {
              if (sheet.id === activeSheetId) {
                return { ...sheet, data: newData };
              }
              return sheet;
            }));
          }

          setUpdatedCells(prev => [...prev, key]);
          setTimeout(() => setUpdatedCells(prev => prev.filter(c => c !== key)), 2000);
          toast({ title: "Sheet Updated by Client", description: `Cell ${client.name} value multiplied by commission ${client.comm}.` });
        }
      }
    },
    clearSheet: () => handleClearSheet(),
    getClientData: (clientId: string) => {
      return clientSheetData[clientId]?.data;
    },
    getClientCurrentData: (clientId: string) => {
        return clientSheetData[clientId]?.data;
    },
    getClientPreviousData: (clientId: string) => {
        const log = props.savedSheetLog.find(l => l.clientId === clientId);
        return log ? log.data : {};
    },
  }));

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
                if (reverseFlag) {
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


  const handleLaddiNum1Change = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    let newLaddiNum1 = value.replace(/[^0-9]/g, '');

    if (runningLaddi) {
        if (newLaddiNum1.length > 2) {
            newLaddiNum1 = newLaddiNum1.slice(0, 2);
        }
    } else {
        if (new Set(newLaddiNum1.split('')).size !== newLaddiNum1.length) {
            toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
            return;
        }
    }

    if (calculateCombinations(newLaddiNum1, laddiNum2, removeJodda, reverseLaddi, runningLaddi) > MAX_COMBINATIONS) {
        toast({ title: "Combination Limit Exceeded", description: `You cannot create more than ${MAX_COMBINATIONS} combinations.`, variant: "destructive" });
        return;
    }
    setLaddiNum1(newLaddiNum1);
  }

  const handleLaddiNum2Change = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    let newLaddiNum2 = value.replace(/[^0-9]/g, '');

    if (runningLaddi) {
        if (newLaddiNum2.length > 2) {
            newLaddiNum2 = newLaddiNum2.slice(0, 2);
        }
    } else {
        if (new Set(newLaddiNum2.split('')).size !== newLaddiNum2.length) {
            toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
            return;
        }
    }
    if (calculateCombinations(laddiNum1, newLaddiNum2, removeJodda, reverseLaddi, runningLaddi) > MAX_COMBINATIONS) {
        toast({ title: "Combination Limit Exceeded", description: `You cannot create more than ${MAX_COMBINATIONS} combinations.`, variant: "destructive" });
        return;
    }
    setLaddiNum2(newLaddiNum2);
  }

  const handleHarupAChange = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const newHarupA = value.replace(/[^0-9]/g, '');
    if (new Set(newHarupA.split('')).size !== newHarupA.length) {
      toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
      return;
    }
    setHarupA(newHarupA);
  };
  
  const handleHarupBChange = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const newHarupB = value.replace(/[^0-9]/g, '');
    if (new Set(newHarupB.split('')).size !== newHarupB.length) {
      toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
      return;
    }
    setHarupB(newHarupB);
  };

  const handleCellChange = (key: string, value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    saveDataForUndo();
    const newData = { ...currentData, [key]: value };
    const newRowTotals = { ...currentRowTotals };

    if (selectedClientId) {
      updateClientData(selectedClientId, newData, newRowTotals);
    } else {
      setSheets(prevSheets => prevSheets.map(sheet => 
        sheet.id === activeSheetId ? { ...sheet, data: newData, rowTotals: newRowTotals } : sheet
      ));
    }
  }

  const handleCellBlur = async (key: string) => {
    if (isDataEntryDisabled) return;

    const cellContent = currentData[key]

    if (!cellContent || cellContent.trim() === "") {
      const newValidations = {...validations};
      delete newValidations[key];
      setValidations(newValidations);
      return;
    }

    setValidations(prev => ({ ...prev, [key]: { isValid: true, recommendation: '', isLoading: true } }))

    try {
      const result: ValidateCellContentOutput = await validateCellContent({
        cellContent,
        validationRules: DUMMY_RULES,
        commonlyUsedAccountNames: DUMMY_ACCOUNTS,
      })
      setValidations(prev => ({ ...prev, [key]: { ...result, isLoading: false } }))
    } catch (error) {
      console.error("Validation error:", error)
      toast({ title: "Error", description: "AI validation failed.", variant: "destructive" })
      setValidations(prev => ({ ...prev, [key]: { isValid: true, recommendation: '', isLoading: false } }))
    }
  }

  const checkBalance = (entryTotal: number): boolean => {
    if (!selectedClientId) return true;

    const client = props.clients.find(c => c.id === selectedClientId);
    if (!client || !client.activeBalance || client.activeBalance === '0') return true;

    const activeBalance = parseFloat(client.activeBalance);
    const logEntry = props.savedSheetLog.find(log => log.clientId === selectedClientId);
    const totalPlayed = logEntry?.gameTotal || 0;
    
    const remainingBalance = activeBalance - totalPlayed;

    if (entryTotal > remainingBalance) {
      toast({
        title: "Balance Limit Exceeded",
        description: `This entry of ${entryTotal} exceeds the remaining balance of ${remainingBalance.toFixed(2)}.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleMultiTextApply = () => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }

    const lines = multiText.split(/[\n#]+/).filter(line => line.trim() !== '');
    let lastEntryString = "";
    let entryTotal = 0;

    const evaluateExpression = (expression: string): string => {
        try {
            if (/^[0-9+\-*/.() ]+$/.test(expression)) {
                // eslint-disable-next-line no-eval
                const result = eval(expression);
                return String(result);
            }
            return expression;
        } catch (e) {
            return expression;
        }
    };

    const formattedLines: string[] = [];
    const updates: { [key: string]: string } = {};

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        const parts = line.split('=');
        if (parts.length !== 2) return;

        const valueStr = evaluateExpression(parts[1].trim());
        const newValue = parseFloat(valueStr);
        if (isNaN(newValue)) return;

        let cellNumbersStr = parts[0].trim();
        
        const cellNumbers = cellNumbersStr.split(/[\s,]+/).filter(s => s);
        entryTotal += newValue * cellNumbers.length;

        const formattedCells = cellNumbers
          .map(s => {
            const num = parseInt(s, 10);
            if (num >= 0 && num <= 99) return String(num).padStart(2, '0');
            return null;
          })
          .filter((s): s is string => s !== null)
          .join(',');

        formattedLines.push(`${formattedCells}=${valueStr}`);

        cellNumbers.forEach(numStr => {
            let cellNum = parseInt(numStr, 10);
            
            if (isNaN(cellNum) || cellNum < 0 || cellNum > 99) return;
            const key = (cellNum).toString().padStart(2, '0');
            
            const currentValueInUpdate = parseFloat(updates[key]) || 0;
            updates[key] = String(currentValueInUpdate + newValue);
        });
    });

    if (!checkBalance(entryTotal)) return;
    saveDataForUndo();

    if (Object.keys(updates).length > 0) {
        const newData = { ...currentData };
        const updatedKeys = Object.keys(updates);
        
        updatedKeys.forEach(key => {
            const currentValue = parseFloat(newData[key]) || 0;
            const addedValue = parseFloat(updates[key]) || 0;
            newData[key] = String(currentValue + addedValue);
        });
        
        lastEntryString = formattedLines.join('\n');
        
        if (selectedClientId) {
            updateClientData(selectedClientId, newData, currentRowTotals);
        } else {
            setSheets(prevSheets => prevSheets.map(sheet =>
                sheet.id === activeSheetId ? { ...sheet, data: newData } : sheet
            ));
        }

        setUpdatedCells(updatedKeys);
        props.setLastEntry(lastEntryString);
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "Sheet Updated", description: `${updatedKeys.length} cell(s) have been updated.` });

        setMultiText("");
    } else {
        toast({ title: "No Updates", description: "No valid cell data found in the input.", variant: "destructive" });
    }
};
  
  const handleLaddiApply = () => {
    if (selectedClientId === null) {
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
                if (reverseLaddi) {
                    combinations.add(`${d2}${d1}`);
                }
            }
        }
    }

    const entryTotal = combinations.size * amountValue;
    if (!checkBalance(entryTotal)) return;
    saveDataForUndo();

    const updates: { [key: string]: string } = {};

    combinations.forEach(cellNumStr => {
        let cellNum = parseInt(cellNumStr, 10);
        if (!isNaN(cellNum) && cellNum >= 0 && cellNum <= 99) {
            const key = (cellNum).toString().padStart(2, '0');
            const currentValueInUpdate = parseFloat(updates[key]) || 0;
            updates[key] = String(currentValueInUpdate + amountValue);
        }
    });

    if (Object.keys(updates).length > 0) {
        const newData = { ...currentData };
        const updatedKeys = Object.keys(updates);

        updatedKeys.forEach(key => {
            const currentValue = parseFloat(newData[key]) || 0;
            const addedValue = parseFloat(updates[key]) || 0;
            newData[key] = String(currentValue + addedValue);
        });

        const lastEntryString = `Laddi: ${laddiNum1}x${laddiNum2}=${laddiAmount} (Jodda: ${removeJodda}, Reverse: ${reverseLaddi}, Running: ${runningLaddi})`;

        if (selectedClientId) {
            updateClientData(selectedClientId, newData, currentRowTotals);
        } else {
            setSheets(prevSheets => prevSheets.map(sheet =>
                sheet.id === activeSheetId ? { ...sheet, data: newData } : sheet
            ));
        }

        setUpdatedCells(updatedKeys);
        props.setLastEntry(lastEntryString);
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "Laddi Updated", description: `${updatedKeys.length} cell(s) have been updated.` });

        setLaddiNum1('');
        setLaddiNum2('');
        setLaddiAmount('');
        setRemoveJodda(false);
        setReverseLaddi(false);
        setRunningLaddi(false);
    } else {
        toast({ title: "No Laddi Updates", description: "No valid cell combinations found to update.", variant: "destructive" });
    }
};

const handleHarupApply = () => {
    if (selectedClientId === null) {
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
    
    let entryTotal = (harupADigits.length + harupBDigits.length) * harupAmountValue;
    
    if (!checkBalance(entryTotal)) return;
    saveDataForUndo();

    const updates: { [key: string]: number } = {};

    harupADigits.forEach(digitA => {
        const cellsForA = new Set<string>();
        for (let i = 0; i < 10; i++) {
            cellsForA.add(parseInt(`${digitA}${i}`).toString().padStart(2, '0'));
        }
        const amountPerCellA = harupAmountValue / cellsForA.size;
        cellsForA.forEach(key => updates[key] = (updates[key] || 0) + amountPerCellA);
    });
    
    harupBDigits.forEach(digitB => {
        const cellsForB = new Set<string>();
        for (let i = 0; i < 10; i++) {
            cellsForB.add(parseInt(`${i}${digitB}`).toString().padStart(2, '0'));
        }
        const amountPerCellB = harupAmountValue / cellsForB.size;
        cellsForB.forEach(key => updates[key] = (updates[key] || 0) + amountPerCellB);
    });

    let lastEntryString = "";
    if (harupADigits.length > 0) lastEntryString += `A: ${harupA}=${harupAmount}\n`;
    if (harupBDigits.length > 0) lastEntryString += `B: ${harupB}=${harupAmount}\n`;

    const newData = { ...currentData };
    const updatedKeys = Object.keys(updates);

    if (updatedKeys.length > 0) {
        updatedKeys.forEach(key => {
            const currentValue = parseFloat(newData[key]) || 0;
            const addedValue = updates[key] || 0;
            newData[key] = String(currentValue + addedValue);
        });

        if (selectedClientId) {
            updateClientData(selectedClientId, newData, currentRowTotals);
        } else {
            setSheets(prevSheets => prevSheets.map(sheet =>
                sheet.id === activeSheetId ? { ...sheet, data: newData } : sheet
            ));
        }

        setUpdatedCells(updatedKeys);
        props.setLastEntry(lastEntryString.trim());
        setTimeout(() => setUpdatedCells([]), 2000);
        toast({ title: "HARUP Updated", description: `${updatedKeys.length} cell(s) have been updated.` });

        setHarupA('');
        setHarupB('');
        setHarupAmount('');
    } else {
        toast({ title: "No HARUP Updates", description: "No valid cells found to update.", variant: "destructive" });
    }
};



  const handleClearSheet = () => {
    if (selectedClientId === null) {
        showClientSelectionToast();
        return;
    }
    saveDataForUndo();
    const emptyData = {};
    const emptyRowTotals = {};

    if (selectedClientId) {
        updateClientData(selectedClientId, emptyData, emptyRowTotals);
    } else {
      setSheets(prevSheets => prevSheets.map(sheet => {
        if (sheet.id === activeSheetId) {
          return { ...sheet, data: emptyData, rowTotals: emptyRowTotals };
        }
        return sheet;
      }));
    }

    setValidations({});
    setMultiText("");
    setUpdatedCells([]);
    setHarupA('');
    setHarupB('');
    setHarupAmount('');
    props.setLastEntry('');
    toast({ title: "Sheet Cleared", description: "All cell values for the current view have been reset." });
  };
  
  const handleGenerateSheet = () => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const valueToCells: { [value: string]: number[] } = {};

    for (const key in currentData) {
      const value = currentData[key];
      if (value && value.trim() !== '' && !isNaN(Number(value)) && Number(value) !== 0) {
        let cellNumber = parseInt(key);
        
        let displayCellNumber = cellNumber;
        
        if (!valueToCells[value]) {
          valueToCells[value] = [];
        }
        valueToCells[value].push(displayCellNumber);
      }
    }

    const generatedText = Object.entries(valueToCells)
      .map(([value, cells]) => {
        cells.sort((a, b) => a - b);
        const formattedCells = cells.map(cell => {
           return String(cell).padStart(2, '0');
        });
        return `${formattedCells.join(',')}=${value}`;
      })
      .join('\n');

    setGeneratedSheetContent(generatedText);
    setIsGeneratedSheetDialogOpen(true);
    toast({ title: "Sheet Generated", description: "The multi-text area has been populated with the grid data." });
  };
  
  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
        toast({ title: "Copied to clipboard!" });
    }, (err) => {
        toast({ title: "Failed to copy", description: "Could not copy text to clipboard.", variant: "destructive" });
        console.error('Failed to copy: ', err);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, handler: () => void) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handler();
    }
  };

  const handleMultiTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const value = e.target.value;
    const parts = value.split('=');
    let numbersPart = parts[0];
    const valuePart = parts.length > 1 ? `=${parts.slice(1).join('=')}` : '';

    const cleanNumbers = numbersPart.replace(/[^0-9, ]/g, '');
    
    const autoFormattedNumbers = cleanNumbers
      .replace(/ /g, ',')
      .replace(/,+/g, ',') 
      .split(',')
      .map(s => s.trim())
      .filter(s => s)
      .flatMap(s => (s.length > 3 && /^\d+$/.test(s) && !s.includes(',')) ? s.match(/.{1,2}/g)?.map(n => n.padStart(2,'0')) || [] : s)
      .join(',');

    setMultiText(`${autoFormattedNumbers}${valuePart}`);
  };

  const handleSaveSheet = () => {
    if (!selectedClientId) {
      toast({
        title: "No Client Selected",
        description: "Please select a client to save their sheet.",
        variant: "destructive",
      });
      return;
    }
    
    // Pass only the new data to be merged in page.tsx
    const newEntries = { ...(clientSheetData[selectedClientId]?.data || {}) };
    
    if (Object.keys(newEntries).length === 0) {
      toast({
        title: "No Data to Save",
        description: "The sheet is empty. Please enter some data before saving.",
        variant: "destructive",
      });
      return;
    }
    
    const clientName = props.clients.find(c => c.id === selectedClientId)?.name || "Unknown Client";
    
    // Let page.tsx handle the merging logic
    props.onClientSheetSave(clientName, selectedClientId, newEntries, props.draw);
    
    // Clear the sheet for the next entry for this client
    updateClientData(selectedClientId, {}, {});
    setPreviousSheetState(null);
  };


  if (!activeSheet) {
    return <div>Loading...</div>;
  }
  
  const rowTotals = Array.from({ length: GRID_ROWS }, (_, rowIndex) => {
    let total = 0;
    for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
      const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
      total += parseFloat(currentData[key]) || 0;
    }
    return total;
  });

  const columnTotals = Array.from({ length: GRID_COLS }, (_, colIndex) => {
    let total = 0;
    for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex++) {
      const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
      total += parseFloat(currentData[key]) || 0;
    }
    return total;
  });

  const grandTotal = rowTotals.reduce((acc, total) => acc + total, 0);

  const getClientDisplay = (client: Client) => {
    const logEntry = props.savedSheetLog.find(log => log.clientId === client.id);
    const totalAmount = logEntry?.gameTotal || 0;
    return `${client.name} - ${totalAmount.toFixed(2)}`;
  };
  
  const allSavedLogsForDraw = Object.values(props.savedSheetLog).flat();


  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-2 flex-grow flex flex-col overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 flex-grow overflow-hidden">
            <div className="flex flex-col min-w-0 h-full">
               <div className="grid gap-0.5 w-full flex-grow" style={{gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS + 1}, minmax(0, 1fr))`}}>
                {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                        const key = String(rowIndex * GRID_COLS + colIndex).padStart(2, '0');
                        const validation = validations[key]
                        const isUpdated = updatedCells.includes(key);

                        return (
                            <div key={key} className="relative flex items-center border border-white rounded-sm">
                               <div className="absolute top-1 left-1.5 text-xs select-none pointer-events-none z-10 text-white">{key}</div>
                              <Input
                                  type="text"
                                  style={{ fontSize: 'clamp(0.8rem, 1.6vh, 1.1rem)'}}
                                  className={`p-0 h-full w-full text-center transition-colors duration-300 border-0 focus:ring-0 bg-transparent font-bold ${validation && !validation.isValid ? 'border-destructive ring-destructive ring-1' : ''} ${isUpdated ? 'bg-primary/20' : ''} ${selectedClientId === null ? 'bg-muted/50 cursor-not-allowed' : 'text-white'}`}
                                  value={currentData[key] || ''}
                                  onChange={(e) => handleCellChange(key, e.target.value)}
                                  onBlur={() => handleCellBlur(key)}
                                  aria-label={`Cell ${key}`}
                                  disabled={selectedClientId === null}
                                  onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                              />
                              {(validation?.isLoading || (validation && !validation.isValid)) && (
                                  <div className="absolute top-1/2 right-1 -translate-y-1/2 z-10">
                                  {validation.isLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  ) : (
                                      <Popover>
                                      <PopoverTrigger asChild>
                                          <button aria-label="Show validation error">
                                          <AlertCircle className="h-3 w-3 text-destructive" />
                                          </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="text-sm">{validation.recommendation}</PopoverContent>
                                      </Popover>
                                  )}
                                  </div>
                              )}
                            </div>
                        )
                    })}
                     <div className="flex items-center justify-center font-medium border border-white rounded-sm bg-transparent text-white">
                      <Input readOnly value={rowTotals[rowIndex]} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent text-white" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 0.9rem)'}}/>
                    </div>
                  </React.Fragment>
                ))}
                {/* Column Totals */}
                {Array.from({ length: GRID_COLS }, (_, colIndex) => (
                  <div key={`col-total-${colIndex}`} className="flex items-center justify-center font-medium p-0 h-full border border-white rounded-sm bg-transparent text-white">
                    <Input readOnly value={columnTotals[colIndex]} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent text-white" style={{ fontSize: 'clamp(0.7rem, 1.4vh, 0.9rem)'}}/>
                  </div>
                ))}
                <div className="flex items-center justify-center font-bold text-lg border border-white rounded-sm text-white">
                    {grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full lg:w-[320px] xl:w-[360px]">
                <div className="border rounded-lg p-2 flex flex-col gap-2 mt-auto">
                    <div className="flex items-center gap-2">
                        <Select value={selectedClientId || 'None'} onValueChange={handleSelectedClientChange}>
                            <SelectTrigger className="flex-grow h-8 text-xs">
                                <SelectValue>
                                  {selectedClientId && props.clients.find(c => c.id === selectedClientId) ? getClientDisplay(props.clients.find(c => c.id === selectedClientId)!) : "Select Client"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">None (Master Sheet)</SelectItem>
                                {props.clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {getClientDisplay(client)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSaveSheet} disabled={!selectedClientId} size="sm" className="h-8 text-xs">
                            <Save className="h-3 w-3 mr-1" />
                            Save
                        </Button>
                        <Button onClick={handleRevertLastEntry} variant="outline" disabled={!previousSheetState || selectedClientId === null} size="sm" className="h-8 text-xs">
                            <Undo2 className="h-3 w-3 mr-1" />
                            Revert
                        </Button>
                    </div>
                </div>
                <div className="border rounded-lg p-2 flex flex-col gap-2">
                    <h3 className="font-semibold text-xs">Multi-Text</h3>
                    <Textarea
                        placeholder="e.g. 1,2,3=50 or 10=20#45=50"
                        rows={1}
                        value={multiText}
                        onChange={handleMultiTextChange}
                        onKeyDown={(e) => handleKeyDown(e, handleMultiTextApply)}
                        className="w-full text-xs"
                        disabled={selectedClientId === null}
                        onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                    />
                    <div className="flex flex-wrap gap-2 mt-1 items-start">
                        <Button onClick={handleMultiTextApply} className="flex-grow sm:flex-grow-0 text-xs h-8" disabled={selectedClientId === null} size="sm">Apply</Button>
                        <Button onClick={handleGenerateSheet} variant="outline" className="flex-grow sm:flex-grow-0 text-xs h-8" disabled={selectedClientId === null} size="sm">
                            Generate
                        </Button>
                        <Button onClick={handleClearSheet} variant="destructive" className="shrink-0 text-xs h-8" disabled={selectedClientId === null} size="sm">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Clear
                        </Button>
                    </div>
                </div>
                
                <div className="border rounded-lg p-2 flex flex-col gap-2">
                  <h3 className="font-semibold mb-1 text-xs">Laddi</h3>
                  <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 flex flex-col items-center gap-1">
                          <Input
                            id="laddiNum1" type="text" pattern="[0-9]*" className="text-center min-w-0 h-8 text-sm" placeholder={runningLaddi ? "Start" : "Num 1"}
                            value={laddiNum1} onChange={(e) => handleLaddiNum1Change(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)} disabled={selectedClientId === null}
                            onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                          />
                          <Label htmlFor="laddiNum1" className="text-xs whitespace-nowrap">{runningLaddi ? "Start" : "Pair"}</Label>
                      </div>
                       <div className="flex flex-col items-center justify-center px-2 my-1">
                        <div className="text-xs font-bold text-primary">{combinationCount}</div>
                        <span className="font-bold text-center text-sm">x</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1">
                          <Input
                            id="laddiNum2" type="text" pattern="[0-9]*" className="text-center min-w-0 h-8 text-sm" placeholder={runningLaddi ? "End" : "Num 2"}
                            value={laddiNum2} onChange={(e) => handleLaddiNum2Change(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)} disabled={selectedClientId === null}
                            onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                          />
                          <Label htmlFor="laddiNum2" className="text-xs whitespace-nowrap">{runningLaddi ? "End" : "Pair"}</Label>
                      </div>
                  </div>
                  <div className="grid grid-cols-5 items-center gap-1">
                    <div className="col-span-3 flex items-center gap-1">
                      <span className="font-bold text-center">=</span>
                      <Input
                        id="amount" type="text" className="text-center font-bold h-8 text-sm"
                        value={laddiAmount} onChange={(e) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setLaddiAmount(e.target.value) }}
                        placeholder="Amount" onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)} disabled={selectedClientId === null}
                        onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button onClick={handleLaddiApply} disabled={selectedClientId === null} size="sm" className="h-8 text-xs">Apply</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2 mt-1">
                      <div className="flex items-center gap-2">
                          <Checkbox id="remove-jodda" checked={removeJodda} onCheckedChange={(checked) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setRemoveJodda(Boolean(checked)) }} disabled={selectedClientId === null || runningLaddi} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                          <Label htmlFor="remove-jodda" className={`text-xs ${selectedClientId === null || runningLaddi ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Jodda</Label>
                           <Checkbox id="reverse-laddi" checked={reverseLaddi} onCheckedChange={(checked) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setReverseLaddi(Boolean(checked)) }} disabled={selectedClientId === null || runningLaddi} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                          <Label htmlFor="reverse-laddi" className={`textxs ${selectedClientId === null || runningLaddi ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Reverse</Label>
                          <Checkbox id="running-laddi" checked={runningLaddi} onCheckedChange={(checked) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setRunningLaddi(Boolean(checked)); setLaddiNum1(''); setLaddiNum2(''); }} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                          <Label htmlFor="running-laddi" className={`text-xs ${selectedClientId === null ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Running</Label>
                      </div>
                  </div>
                </div>
              
                <div className="border rounded-lg p-2 flex flex-col gap-2">
                  <h3 className="font-semibold mb-1 text-xs">HARUP</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    <div className="flex items-center gap-1">
                        <Label htmlFor="harupA" className="w-6 text-center shrink-0 text-xs">A</Label>
                        <Input id="harupA" placeholder="e.g. 123" className="min-w-0 h-8 text-xs" value={harupA} onChange={(e) => handleHarupAChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                    </div>
                    <div className="flex items-center gap-1">
                        <Label htmlFor="harupB" className="w-6 text-center shrink-0 text-xs">B</Label>
                        <Input id="harupB" placeholder="e.g. 456" className="min-w-0 h-8 text-xs" value={harupB} onChange={(e) => handleHarupBChange(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                    </div>
                  </div>
                   <div className="flex items-center gap-2 mt-1">
                      <Label htmlFor="harupAmount" className="w-6 text-center shrink-0 text-xs">=</Label>
                      <Input id="harupAmount" placeholder="Amount" className="font-bold h-8 text-xs" value={harupAmount} onChange={(e) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setHarupAmount(e.target.value) }} onKeyDown={(e) => handleKeyDown(e, handleHarupApply)} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                      <Button onClick={handleHarupApply} disabled={selectedClientId === null} size="sm" className="h-8 text-xs">Apply</Button>
                  </div>
                </div>
                <div className="border rounded-lg p-2 flex flex-col gap-2">
                    <Button onClick={() => setIsMasterSheetDialogOpen(true)} variant="outline" className="w-full">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        View Master Sheet
                    </Button>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isGeneratedSheetDialogOpen} onOpenChange={setIsGeneratedSheetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generated Sheet Content</DialogTitle>
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
      
      <Dialog open={isMasterSheetDialogOpen} onOpenChange={setIsMasterSheetDialogOpen}>
        <DialogContent className="max-w-full w-full h-full max-h-full sm:max-w-full p-0">
          <DialogHeader className="flex-row items-center p-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => setIsMasterSheetDialogOpen(false)} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <DialogTitle>Master Sheet : {props.draw}</DialogTitle>
          </DialogHeader>
           <MasterSheetViewer 
             savedSheetLog={props.savedSheetLog}
             draw={props.draw}
           />
        </DialogContent>
      </Dialog>


      <Dialog open={props.isLastEntryDialogOpen} onOpenChange={props.setIsLastEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Last Entry</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <Textarea
              readOnly
              value={props.lastEntry || "No entries yet."}
              rows={Math.min(15, (props.lastEntry || "").split('\n').length)}
              className="bg-muted"
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
             <Button onClick={() => handleCopyToClipboard(props.lastEntry)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
});

GridSheet.displayName = 'GridSheet';

export default GridSheet;

    
