"use client"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { validateCellContent, ValidateCellContentOutput } from "@/ai/flows/validate-cell-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, Plus, AlertCircle, Loader2 } from "lucide-react"

type CellData = { [key: string]: string }
type ValidationResult = {
  isValid: boolean
  recommendation: string
}
type CellValidation = { [key: string]: ValidationResult & { isLoading: boolean } }

type Sheet = {
  id: string
  name: string
  data: CellData
}

const initialSheets: Sheet[] = [
  { id: "1", name: "Q1 2024 Report", data: { '0_0': 'Revenue', '0_1': '50000', '1_0': 'Expenses', '1_1': '-21050' } },
  { id: "2", name: "Q2 2024 Estimates", data: { '0_0': 'Projected Revenue', '0_1': '75000' } },
]

const GRID_SIZE = 10;
const DUMMY_ACCOUNTS = "Revenue, Expenses, Assets, Liabilities, Equity, COGS"
const DUMMY_RULES = "Cell content must be a number or a standard account name. If it's a number, it can be positive or negative."

export default function GridSheet() {
  const { toast } = useToast()
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets)
  const [activeSheetId, setActiveSheetId] = useState<string>("1")
  const [validations, setValidations] = useState<CellValidation>({})

  const activeSheet = sheets.find(s => s.id === activeSheetId)!

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === activeSheetId) {
        const key = `${rowIndex}_${colIndex}`
        const newData = { ...sheet.data, [key]: value }
        return { ...sheet, data: newData }
      }
      return sheet
    })
    setSheets(updatedSheets)
  }

  const handleCellBlur = async (rowIndex: number, colIndex: number) => {
    const key = `${rowIndex}_${colIndex}`
    const cellContent = activeSheet.data[key]

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

  const handleCreateNewSheet = () => {
    const newSheet: Sheet = {
      id: Date.now().toString(),
      name: `Sheet ${sheets.length + 1}`,
      data: {}
    }
    setSheets([...sheets, newSheet])
    setActiveSheetId(newSheet.id)
  }

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    const rows = Array.from({ length: GRID_SIZE }, (_, rowIndex) =>
      Array.from({ length: GRID_SIZE }, (_, colIndex) => {
        const key = `${rowIndex}_${colIndex}`
        const cellValue = activeSheet.data[key] || ""
        return `"${cellValue.replace(/"/g, '""')}"`
      }).join(",")
    ).join("\n")

    csvContent += rows
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${activeSheet.name}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Sheet: {activeSheet.name}</CardTitle>
            <CardDescription>A 10x10 grid for your accounting data. Cells are numbered 1 to 100.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={activeSheetId} onValueChange={setActiveSheetId}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Select a sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheets.map(sheet => (
                  <SelectItem key={sheet.id} value={sheet.id}>{sheet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleCreateNewSheet}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">Create new sheet</span>
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-10 gap-1 overflow-x-auto">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
            const rowIndex = Math.floor(i / GRID_SIZE)
            const colIndex = i % GRID_SIZE
            const cellNumber = i + 1
            const key = `${rowIndex}_${colIndex}`
            const validation = validations[key]

            return (
              <div key={key} className="relative min-w-[100px]">
                <div className="absolute top-0.5 left-1 text-xs text-muted-foreground select-none pointer-events-none z-10">{cellNumber}</div>
                <Input
                  type="text"
                  className={`pt-5 text-sm ${validation && !validation.isValid ? 'border-destructive ring-destructive ring-1' : ''}`}
                  value={activeSheet.data[key] || ''}
                  onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                  onBlur={() => handleCellBlur(rowIndex, colIndex)}
                  aria-label={`Cell ${cellNumber}`}
                />
                 {(validation?.isLoading || (validation && !validation.isValid)) && (
                  <div className="absolute top-1/2 right-2 -translate-y-1/2 z-10">
                    {validation.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                           <button aria-label="Show validation error">
                            <AlertCircle className="h-4 w-4 text-destructive" />
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
      </CardContent>
    </Card>
  )
}
