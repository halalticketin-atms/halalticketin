'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
    ArrowLeft,
    Plus,
    Trash2,
    GripVertical,
    Type,
    AlignLeft,
    ChevronDown,
    ToggleLeft,
    List,
    Eye,
    Save,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

type FieldType = 'text' | 'textarea' | 'dropdown' | 'checkbox' | 'radio';

interface CustomField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
}

const fieldTypeIcons: Record<FieldType, React.ElementType> = {
    text: Type,
    textarea: AlignLeft,
    dropdown: ChevronDown,
    checkbox: ToggleLeft,
    radio: List,
};

const fieldTypeLabels: Record<FieldType, string> = {
    text: 'Short Text',
    textarea: 'Long Text',
    dropdown: 'Dropdown',
    checkbox: 'Checkbox',
    radio: 'Multiple Choice',
};

// Default fields that cannot be removed
const defaultFields: CustomField[] = [
    { id: 'default-name', type: 'text', label: 'Full Name', required: true },
    { id: 'default-email', type: 'text', label: 'Email Address', required: true },
];

export default function RegistrationFormBuilderPage() {
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);

    const addField = (type: FieldType) => {
        const newField: CustomField = {
            id: String(Date.now()),
            type,
            label: `New ${fieldTypeLabels[type]}`,
            placeholder: '',
            required: false,
            options: type === 'dropdown' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
        };
        setCustomFields([...customFields, newField]);
        setEditingField(newField.id);
    };

    const updateField = (id: string, updates: Partial<CustomField>) => {
        setCustomFields(fields =>
            fields.map(f => f.id === id ? { ...f, ...updates } : f)
        );
    };

    const removeField = (id: string) => {
        setCustomFields(fields => fields.filter(f => f.id !== id));
        if (editingField === id) setEditingField(null);
    };

    const addOption = (fieldId: string) => {
        setCustomFields(fields =>
            fields.map(f => {
                if (f.id === fieldId && f.options) {
                    return { ...f, options: [...f.options, `Option ${f.options.length + 1}`] };
                }
                return f;
            })
        );
    };

    const updateOption = (fieldId: string, index: number, value: string) => {
        setCustomFields(fields =>
            fields.map(f => {
                if (f.id === fieldId && f.options) {
                    const newOptions = [...f.options];
                    newOptions[index] = value;
                    return { ...f, options: newOptions };
                }
                return f;
            })
        );
    };

    const removeOption = (fieldId: string, index: number) => {
        setCustomFields(fields =>
            fields.map(f => {
                if (f.id === fieldId && f.options && f.options.length > 1) {
                    return { ...f, options: f.options.filter((_, i) => i !== index) };
                }
                return f;
            })
        );
    };

    const allFields = [...defaultFields, ...customFields];

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background border-b">
                <div className="container flex h-14 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/events/create">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <h1 className="font-display text-lg font-semibold">Registration Form</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </Button>
                        <Button>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Default Fields */}
                    <div className="mb-6">
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">Default Fields (Always Shown)</h2>
                        <div className="space-y-2">
                            {defaultFields.map(field => (
                                <Card key={field.id} className="bg-muted/30">
                                    <CardContent className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                                <Type className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{field.label}</p>
                                            </div>
                                            <Badge variant="secondary">Required</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Custom Fields */}
                    <div className="mb-6">
                        <h2 className="text-sm font-medium text-muted-foreground mb-3">Custom Fields</h2>

                        {customFields.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="py-12 text-center">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Plus className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="font-medium">No custom fields yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Add fields to collect more information from attendees
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Reorder.Group
                                axis="y"
                                values={customFields}
                                onReorder={setCustomFields}
                                className="space-y-3"
                            >
                                {customFields.map(field => {
                                    const Icon = fieldTypeIcons[field.type];
                                    const isEditing = editingField === field.id;

                                    return (
                                        <Reorder.Item key={field.id} value={field}>
                                            <Card className={`transition-all ${isEditing ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                                                <CardContent className="py-4 px-4">
                                                    {/* Field Header */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="cursor-grab active:cursor-grabbing">
                                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Icon className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div
                                                            className="flex-1 cursor-pointer"
                                                            onClick={() => setEditingField(isEditing ? null : field.id)}
                                                        >
                                                            <p className="font-medium">{field.label || 'Untitled Field'}</p>
                                                            <p className="text-xs text-muted-foreground">{fieldTypeLabels[field.type]}</p>
                                                        </div>
                                                        {field.required && (
                                                            <Badge variant="secondary" className="text-xs">Required</Badge>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => removeField(field.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    {/* Expanded Edit View */}
                                                    <AnimatePresence>
                                                        {isEditing && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="pt-4 mt-4 border-t space-y-4">
                                                                    <div className="space-y-2">
                                                                        <Label>Field Label</Label>
                                                                        <Input
                                                                            value={field.label}
                                                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                                            placeholder="Enter field label"
                                                                        />
                                                                    </div>

                                                                    {(field.type === 'text' || field.type === 'textarea') && (
                                                                        <div className="space-y-2">
                                                                            <Label>Placeholder Text</Label>
                                                                            <Input
                                                                                value={field.placeholder || ''}
                                                                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                                                                placeholder="Enter placeholder text"
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {(field.type === 'dropdown' || field.type === 'radio') && field.options && (
                                                                        <div className="space-y-2">
                                                                            <Label>Options</Label>
                                                                            <div className="space-y-2">
                                                                                {field.options.map((option, index) => (
                                                                                    <div key={index} className="flex gap-2">
                                                                                        <Input
                                                                                            value={option}
                                                                                            onChange={(e) => updateOption(field.id, index, e.target.value)}
                                                                                            placeholder={`Option ${index + 1}`}
                                                                                        />
                                                                                        {field.options!.length > 1 && (
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="shrink-0"
                                                                                                onClick={() => removeOption(field.id, index)}
                                                                                            >
                                                                                                <X className="h-4 w-4" />
                                                                                            </Button>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => addOption(field.id)}
                                                                                >
                                                                                    <Plus className="h-3 w-3 mr-1" />
                                                                                    Add Option
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex items-center justify-between">
                                                                        <Label htmlFor={`required-${field.id}`}>Required Field</Label>
                                                                        <Switch
                                                                            id={`required-${field.id}`}
                                                                            checked={field.required}
                                                                            onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </CardContent>
                                            </Card>
                                        </Reorder.Item>
                                    );
                                })}
                            </Reorder.Group>
                        )}
                    </div>

                    {/* Add Field Buttons */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Add Field</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {(Object.keys(fieldTypeIcons) as FieldType[]).map(type => {
                                    const Icon = fieldTypeIcons[type];
                                    return (
                                        <Button
                                            key={type}
                                            variant="outline"
                                            className="flex-col h-auto py-4 gap-2"
                                            onClick={() => addField(type)}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="text-xs">{fieldTypeLabels[type]}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Form Preview</DialogTitle>
                        <DialogDescription>
                            This is how attendees will see the registration form.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {allFields.map(field => (
                            <div key={field.id} className="space-y-2">
                                <Label>
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </Label>

                                {field.type === 'text' && (
                                    <Input placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} />
                                )}

                                {field.type === 'textarea' && (
                                    <textarea
                                        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                        rows={3}
                                        placeholder={field.placeholder}
                                    />
                                )}

                                {field.type === 'dropdown' && (
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options?.map((option, i) => (
                                                <SelectItem key={i} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {field.type === 'checkbox' && (
                                    <div className="flex items-center gap-2">
                                        <Checkbox id={field.id} />
                                        <label htmlFor={field.id} className="text-sm">Yes</label>
                                    </div>
                                )}

                                {field.type === 'radio' && (
                                    <div className="space-y-2">
                                        {field.options?.map((option, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input type="radio" name={field.id} id={`${field.id}-${i}`} className="h-4 w-4" />
                                                <label htmlFor={`${field.id}-${i}`} className="text-sm">{option}</label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
