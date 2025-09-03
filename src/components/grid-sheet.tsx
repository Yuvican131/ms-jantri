
"use client"
import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { validateCellContent, ValidateCellContentOutput } from "@/ai/flows/validate-cell-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, Plus, AlertCircle, Loader2, Trash2, Copy, X, Save, RotateCcw, Undo2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import type { Client } from "./clients-manager"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"

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
};

type GridSheetProps = {
  draw: string;
  date: Date;
  lastEntry: string;
  setLastEntry: (entry: string) => void;
  isLastEntryDialogOpen: boolean;
  setIsLastEntryDialogOpen: (open: boolean) => void;
  clients: Client[];
  onClientSheetSave: (clientName: string, gameTotal: number) => void;
}


const GridSheet = forwardRef<GridSheetHandle, GridSheetProps>((props, ref) => {
  const { toast } = useToast()
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets)
  const [activeSheetId, setActiveSheetId] = useState<string>("1")
  const [clientSheetData, setClientSheetData] = useState<ClientSheetData>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [validations, setValidations] = useState<CellValidation>({})
  const [multiText, setMultiText] = useState("");
  const [updatedCells, setUpdatedCells] = useState<string[]>([]);
  const [laddiNum1, setLaddiNum1] = useState('');
  const [laddiNum2, setLaddiNum2] = useState('');
  const [laddiAmount, setLaddiAmount] = useState('');
  const [removeJodda, setRemoveJodda] = useState(false);
  const [combinationCount, setCombinationCount] = useState(0);

  const [harupA, setHarupA] = useState('');
  const [harupB, setHarupB] = useState('');
  const [harupAmount, setHarupAmount] = useState('');
  const [isGeneratedSheetDialogOpen, setIsGeneratedSheetDialogOpen] = useState(false);
  const [isMasterSheetDialogOpen, setIsMasterSheetDialogOpen] = useState(false);
  const [generatedSheetContent, setGeneratedSheetContent] = useState("");
  const [cuttingValue, setCuttingValue] = useState("");
  const [lessValue, setLessValue] = useState("");
  const [dabbaValue, setDabbaValue] = useState("");
  const [masterSheetData, setMasterSheetData] = useState<CellData>({});

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
  }));

  const calculateCombinations = (num1: string, num2: string, removeJoddaFlag: boolean): number => {
    const digits1 = num1.split('');
    const digits2 = num2.split('');
    let count = 0;
    if (digits1.length > 0 && digits2.length > 0) {
      if (removeJoddaFlag) {
        for (const d1 of digits1) {
          for (const d2 of digits2) {
            if (d1 !== d2) {
              count++;
            }
          }
        }
      } else {
        count = digits1.length * digits2.length;
      }
    }
    return count;
  };

  useEffect(() => {
    const count = calculateCombinations(laddiNum1, laddiNum2, removeJodda);
    setCombinationCount(count);
  }, [laddiNum1, laddiNum2, removeJodda]);

  const handleLaddiNum1Change = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const newLaddiNum1 = value.replace(/[^0-9]/g, '');
    if (new Set(newLaddiNum1.split('')).size !== newLaddiNum1.length) {
      toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
      return;
    }
    if (calculateCombinations(newLaddiNum1, laddiNum2, removeJodda) > MAX_COMBINATIONS) {
        toast({ title: "Combination Limit Exceeded", description: `You cannot create more than ${MAX_COMBINATIONS} combinations.`, variant: "destructive" });
        return;
    }
    setLaddiNum1(newLaddiNum1);
    setLaddiNum2(newLaddiNum1);
  }

  const handleLaddiNum2Change = (value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    const newLaddiNum2 = value.replace(/[^0-9]/g, '');
    if (new Set(newLaddiNum2.split('')).size !== newLaddiNum2.length) {
        toast({ title: "Validation Error", description: "Duplicate digits are not allowed in this field.", variant: "destructive" });
        return;
    }
    if (calculateCombinations(laddiNum1, newLaddiNum2, removeJodda) > MAX_COMBINATIONS) {
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

  const getRowTotal = (rowIndex: number) => {
    if (currentRowTotals[rowIndex] !== undefined) {
      return currentRowTotals[rowIndex];
    }
    return calculateRowTotal(rowIndex, currentData).toString();
  }

  const calculateGrandTotal = (data: CellData, totals: { [key: number]: string }) => {
    let total = 0;
    for (let i = 0; i < GRID_ROWS; i++) {
        if (totals[i] !== undefined) {
            total += Number(totals[i]);
        } else {
            total += calculateRowTotal(i, data);
        }
    }
    return total;
  };

  const handleRowTotalChange = (rowIndex: number, value: string) => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    saveDataForUndo();
    const newRowTotals = { ...currentRowTotals, [rowIndex]: value };
    if (selectedClientId) {
      updateClientData(selectedClientId, currentData, newRowTotals);
    } else {
      setSheets(prevSheets => prevSheets.map(sheet => 
        sheet.id === activeSheetId ? { ...sheet, rowTotals: newRowTotals } : sheet
      ));
    }
  };

  const handleRowTotalBlur = (rowIndex: number, value: string) => {
    if (isDataEntryDisabled) return;
    if(value.trim() === '') {
      handleRowTotalChange(rowIndex, '0');
    }
  }

  const handleMultiTextApply = () => {
    if (selectedClientId === null) {
      showClientSelectionToast();
      return;
    }
    saveDataForUndo();
    const lines = multiText.split(/[\n#]+/).filter(line => line.trim() !== '');
    let lastEntryString = "";

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
    if (!laddiNum1 || !laddiNum2 || !laddiAmount) {
        toast({ title: "Laddi Error", description: "Please fill all Laddi fields.", variant: "destructive" });
        return;
    }
    
    saveDataForUndo();
    const updates: { [key: string]: string } = {};
    const amountValue = parseFloat(laddiAmount);
     if (isNaN(amountValue)) {
      toast({ title: "Laddi Error", description: "Invalid amount.", variant: "destructive" });
      return;
    }
    
    const digits1 = laddiNum1.split('');
    const digits2 = laddiNum2.split('');

    for (const d1 of digits1) {
        for (const d2 of digits2) {
            if (removeJodda && d1 === d2) continue;

            let cellNumStr = `${d1}${d2}`;
            let cellNum = parseInt(cellNumStr, 10);
            
            if (!isNaN(cellNum) && cellNum >= 0 && cellNum <= 99) {
                const key = (cellNum).toString().padStart(2, '0');
                
                const currentValueInUpdate = parseFloat(updates[key]) || 0;
                updates[key] = String(currentValueInUpdate + amountValue);
            }
        }
    }

    if (Object.keys(updates).length > 0) {
        const newData = { ...currentData };
        const updatedKeys = Object.keys(updates);

        updatedKeys.forEach(key => {
            const currentValue = parseFloat(newData[key]) || 0;
            const addedValue = parseFloat(updates[key]) || 0;
            newData[key] = String(currentValue + addedValue);
        });

        const lastEntryString = `${laddiNum1}x${laddiNum2}=${laddiAmount}`;

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
    
    saveDataForUndo();

    const affectedCells = new Set<string>();

    harupADigits.forEach(digit => {
        for (let i = 0; i < 10; i++) {
            let cellNum = parseInt(`${digit}${i}`, 10);
            affectedCells.add((cellNum).toString().padStart(2, '0'));
        }
    });

    harupBDigits.forEach(digit => {
        for (let i = 0; i < 10; i++) {
            let cellNum = parseInt(`${i}${digit}`, 10);
            affectedCells.add((cellNum).toString().padStart(2, '0'));
        }
    });
    
    if (affectedCells.size === 0) {
        toast({ title: "No HARUP Updates", description: "No valid cells found to update.", variant: "destructive" });
        return;
    }

    const amountPerCell = harupAmountValue / affectedCells.size;
    const updates: { [key: string]: number } = {};

    affectedCells.forEach(key => {
        updates[key] = (updates[key] || 0) + amountPerCell;
    });

    let lastEntryString = "";
    if (harupADigits.length > 0) lastEntryString += `A: ${harupA}=${harupAmount}\n`;
    if (harupBDigits.length > 0) lastEntryString += `B: ${harupB}=${harupAmount}\n`;

    const newData = { ...currentData };
    const updatedKeys = Array.from(affectedCells);

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
        description: "Please select a client to save their sheet to the master sheet.",
        variant: "destructive",
      });
      return;
    }

    const clientData = clientSheetData[selectedClientId]?.data || {};
    const clientRowTotals = clientSheetData[selectedClientId]?.rowTotals || {};
    const clientName = props.clients.find(c => c.id === selectedClientId)?.name || "Unknown Client";
    
    const gameTotal = calculateGrandTotal(clientData, clientRowTotals);
    props.onClientSheetSave(clientName, gameTotal);

    setSheets(prevSheets => prevSheets.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newMasterData = { ...sheet.data };
        Object.keys(clientData).forEach(key => {
          const masterValue = parseFloat(newMasterData[key]) || 0;
          const clientValue = parseFloat(clientData[key]) || 0;
          newMasterData[key] = String(masterValue + clientValue);
        });
        const newMasterRowTotals = { ...sheet.rowTotals };
        Object.keys(clientRowTotals).forEach(rowIndexStr => {
            const rowIndex = parseInt(rowIndexStr, 10);
            const masterRowTotal = calculateRowTotal(rowIndex, newMasterData);
            newMasterRowTotals[rowIndex] = masterRowTotal.toString();
        });

        return { ...sheet, data: newMasterData, rowTotals: newMasterRowTotals };
      }
      return sheet;
    }));

    // Clear client's sheet
    updateClientData(selectedClientId, {}, {});
    setPreviousSheetState(null);

    toast({
      title: "Sheet Saved",
      description: `${clientName}'s data has been saved to the master sheet and their sheet has been cleared.`,
    });
  };

  const handleClearMasterSheet = () => {
    setSheets(prevSheets => prevSheets.map(sheet => {
      if (sheet.id === activeSheetId) {
        return { ...sheet, data: {}, rowTotals: {} };
      }
      return sheet;
    }));
    toast({ title: "Master Sheet Cleared", description: "All data from the master sheet has been removed." });
  };


  if (!activeSheet) {
    return <div>Loading...</div>;
  }

  const masterSheetRowTotal = (rowIndex: number) => {
    return calculateRowTotal(rowIndex, masterSheetData).toString();
  };

  const masterSheetGrandTotal = () => {
    return calculateGrandTotal(masterSheetData, {});
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

  const openMasterSheetDialog = () => {
    setMasterSheetData({ ...activeSheet.data });
    setIsMasterSheetDialogOpen(true);
  };
  
  const handleResetMasterSheetChanges = () => {
    setMasterSheetData({ ...activeSheet.data });
    setCuttingValue("");
    setLessValue("");
    setDabbaValue("");
    toast({ title: "Changes Reset", description: "Cutting, Less, and Dabba changes have been reverted." });
  };
  
  const handleSaveMasterSheetChanges = () => {
    setSheets(prevSheets => prevSheets.map(sheet =>
      sheet.id === activeSheetId ? { ...sheet, data: masterSheetData } : sheet
    ));
    toast({ title: "Master Sheet Updated", description: "Changes have been saved." });
    setIsMasterSheetDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-2">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-2">
            <div className="flex flex-col min-w-0">
              <div className="grid gap-0.5 w-full" style={{gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`}}>
                {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, index) => {
                    const rowIndex = Math.floor(index / GRID_COLS);
                    const colIndex = index % GRID_COLS;
                    const cellNumber = rowIndex * GRID_COLS + colIndex;
                    const displayCellNumber = String(cellNumber).padStart(2, '0');
                    const key = displayCellNumber;
                    const validation = validations[key]
                    const isUpdated = updatedCells.includes(key);

                    return (
                        <div key={key} className="relative aspect-square border border-primary/30 rounded-sm">
                          <div className="absolute top-0 left-0.5 text-xs text-cyan-400/80 select-none pointer-events-none z-10" style={{fontSize: '0.6rem'}}>{displayCellNumber}</div>
                          <Input
                              type="text"
                              style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.75rem)'}}
                              className={`p-0 h-full w-full text-center transition-colors duration-300 border-0 focus:ring-0 bg-transparent ${validation && !validation.isValid ? 'border-destructive ring-destructive ring-1' : ''} ${isUpdated ? 'bg-primary/20' : ''} ${selectedClientId === null ? 'bg-muted/50 cursor-not-allowed' : 'bg-transparent text-sky-200'}`}
                              value={currentData[key] || ''}
                              onChange={(e) => handleCellChange(key, e.target.value)}
                              onBlur={() => handleCellBlur(key)}
                              aria-label={`Cell ${displayCellNumber}`}
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
              </div>

               {/* Row Totals and Column Totals */}
              <div className="grid gap-0.5 mt-0.5" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr) auto` }}>
                {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                    let total = 0;
                    for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex++) {
                        const key = (rowIndex * GRID_COLS + colIndex).toString().padStart(2, '0');
                        total += parseFloat(currentData[key]) || 0;
                    }
                    return (
                        <div key={`col-total-${colIndex}`} className="flex items-center justify-center font-medium p-0">
                           <Input readOnly value={total} className="font-medium text-center h-full w-full p-1 border-0 focus:ring-0 bg-transparent text-green-400" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.75rem)'}}/>
                        </div>
                    );
                })}
                <div className="flex items-center justify-center p-1 font-bold bg-primary/20 rounded-sm text-base">
                  {calculateGrandTotal(currentData, currentRowTotals)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-10 gap-0.5">
                  {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
                      <div key={`row-total-${rowIndex}`} className="col-span-1 flex items-center justify-center p-0 font-medium border-transparent border aspect-square">
                        <Input
                          type="text"
                          className={`font-medium text-center h-full w-full p-0 border-0 focus:ring-0 bg-transparent text-red-500 ${selectedClientId === null ? 'bg-muted/50 cursor-not-allowed' : 'bg-transparent'}`}
                          style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.75rem)'}}
                          value={getRowTotal(rowIndex)}
                          onChange={(e) => handleRowTotalChange(rowIndex, e.target.value)}
                          onBlur={(e) => handleRowTotalBlur(rowIndex, e.target.value)}
                          aria-label={`Row ${rowIndex} Total`}
                          disabled={selectedClientId === null}
                          onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                        />
                      </div>
                  ))}
                </div>

                <div className="border rounded-lg p-2 flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2">
                        <Select value={selectedClientId || 'None'} onValueChange={handleSelectedClientChange}>
                            <SelectTrigger className="flex-grow h-8 text-xs">
                                <SelectValue placeholder="Select Client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">None (Master Sheet)</SelectItem>
                                {props.clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
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
                  <div className="grid grid-cols-5 items-center gap-1 mb-1">
                      <Input
                        id="laddiNum1" type="text" pattern="[0-9]*" className="text-center min-w-0 col-span-2 h-8 text-sm" placeholder="Num 1"
                        value={laddiNum1} onChange={(e) => handleLaddiNum1Change(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)} disabled={selectedClientId === null}
                        onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                      />
                      <span className="font-bold text-center text-sm">x</span>
                      <Input
                        id="laddiNum2" type="text" pattern="[0-9]*" className="text-center min-w-0 col-span-2 h-8 text-sm" placeholder="Num 2"
                        value={laddiNum2} onChange={(e) => handleLaddiNum2Change(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLaddiApply)} disabled={selectedClientId === null}
                        onClick={selectedClientId === null ? showClientSelectionToast : undefined}
                      />
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
                          <Checkbox id="remove-jodda" checked={removeJodda} onCheckedChange={(checked) => { if (selectedClientId === null) { showClientSelectionToast(); return; } setRemoveJodda(Boolean(checked)) }} disabled={selectedClientId === null} onClick={selectedClientId === null ? showClientSelectionToast : undefined}/>
                          <Label htmlFor="remove-jodda" className={`text-xs ${selectedClientId === null ? 'cursor-not-allowed text-muted-foreground' : ''}`}>Jodda</Label>
                      </div>
                      <div className="text-xs font-bold text-primary">{combinationCount} Combos</div>
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
                      <Button onClick={handleHarupApply} disabled={selectedClientId === null} size="sm" className="h-8 text-xs">Apply</Button>                  </div>
              </div>
              <div className="w-full flex flex-row gap-2 mt-auto pt-2">
                <Button onClick={openMasterSheetDialog} variant="outline" className="w-full">
                    Master Sheet
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Master Sheet - {activeSheet.name}</DialogTitle>
             <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-6">
            <div className="overflow-x-auto w-full my-4">
                <div className="grid gap-1 w-full" style={{gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))`, minWidth: '600px'}}>
                  {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
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
                      <div className="flex items-center justify-center p-2 font-medium min-w-[80px] sm:min-w-[100px] rounded-md">
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
                  <div style={{ gridColumn: `span ${GRID_COLS}` }} className="flex items-center justify-end p-2 font-bold min-w-[80px] sm:min-w-[100px] mt-1 pr-4">Total</div>
                  <div className="flex items-center justify-center p-2 font-bold min-w-[80px] sm:min-w-[100px] bg-primary/20 rounded-md mt-1">
                      {masterSheetGrandTotal()}
                    </div>
                </div>
            </div>
            <div className="mt-4 p-4 border-t">
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
                   <div className="flex items-center gap-2">
                      <Label htmlFor="master-reset" className="text-sm">Reset</Label>
                      <Button onClick={handleResetMasterSheetChanges} size="sm" id="master-reset" variant="destructive">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                  </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 sm:justify-between">
             <Button variant="outline" onClick={handleClearMasterSheet}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Master Sheet
            </Button>
            <div>
              <DialogClose asChild>
                <Button type="button" variant="secondary" className="mr-2">Close</Button>
              </DialogClose>
              <Button onClick={handleSaveMasterSheetChanges}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </DialogFooter>
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

    