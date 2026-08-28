import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface ModifierOption {
  id?: string;
  name: string;
  price: number;
  sortOrder: number;
}

export interface ModifierGroup {
  id?: string;
  name: string;
  selectionType: "single" | "multiple";
  isRequired: boolean;
  sortOrder: number;
  options: ModifierOption[];
}

interface ModifierManagerProps {
  modifiers: ModifierGroup[];
  onChange: (modifiers: ModifierGroup[]) => void;
}

export function ModifierManager({ modifiers, onChange }: ModifierManagerProps) {
  const addGroup = () => {
    onChange([
      ...modifiers,
      {
        name: "",
        selectionType: "single",
        isRequired: false,
        sortOrder: modifiers.length,
        options: [],
      },
    ]);
  };

  const removeGroup = (index: number) => {
    onChange(modifiers.filter((_, i) => i !== index));
  };

  const updateGroup = (index: number, field: keyof ModifierGroup, value: any) => {
    const newModifiers = [...modifiers];
    newModifiers[index] = { ...newModifiers[index], [field]: value };
    onChange(newModifiers);
  };

  const addOption = (groupIndex: number) => {
    const newModifiers = [...modifiers];
    newModifiers[groupIndex].options.push({
      name: "",
      price: 0,
      sortOrder: newModifiers[groupIndex].options.length,
    });
    onChange(newModifiers);
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const newModifiers = [...modifiers];
    newModifiers[groupIndex].options.splice(optionIndex, 1);
    onChange(newModifiers);
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    field: keyof ModifierOption,
    value: any,
  ) => {
    const newModifiers = [...modifiers];
    newModifiers[groupIndex].options[optionIndex] = {
      ...newModifiers[groupIndex].options[optionIndex],
      [field]: value,
    };
    onChange(newModifiers);
  };

  return (
    <div className="space-y-6">
      {modifiers.map((group, groupIndex) => (
        <div key={groupIndex} className="border rounded-md p-4 space-y-4 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Modifier Group Name</Label>
                <Input
                  value={group.name}
                  onChange={(e) => updateGroup(groupIndex, "name", e.target.value)}
                  placeholder="e.g. Size, Add-ons"
                />
              </div>

              <div className="space-y-2">
                <Label>Selection Type</Label>
                <Select
                  value={group.selectionType}
                  onValueChange={(val) => updateGroup(groupIndex, "selectionType", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Choice (Radio)</SelectItem>
                    <SelectItem value="multiple">Multiple Choice (Checkbox)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col justify-end pb-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={group.isRequired}
                    onCheckedChange={(checked) => updateGroup(groupIndex, "isRequired", checked)}
                    id={`required-${groupIndex}`}
                  />
                  <Label htmlFor={`required-${groupIndex}`}>Required</Label>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeGroup(groupIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="pl-4 border-l-2 space-y-3">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
              Options
            </Label>

            {group.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Input
                  className="flex-1"
                  placeholder="Option Name (e.g. Extra Cheese)"
                  value={option.name}
                  onChange={(e) => updateOption(groupIndex, optionIndex, "name", e.target.value)}
                />
                <div className="w-32 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    className="pl-7"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={option.price}
                    onChange={(e) =>
                      updateOption(
                        groupIndex,
                        optionIndex,
                        "price",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(groupIndex, optionIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => addOption(groupIndex)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={addGroup}
        className="w-full border-dashed border-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Modifier Group
      </Button>
    </div>
  );
}
