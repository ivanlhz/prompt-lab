import { Card } from "../atoms";
import { Button, Input, Label, Textarea } from "../atoms";
import { FormField } from "../molecules";
import ImageUploader from "../ImageUploader";

interface Props {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFileSelected: (file: File) => void;
  onSubmit: () => void;
  onCancel: () => void;
  creating: boolean;
  errors: Record<string, string>;
}

export default function CreateExperimentForm({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onFileSelected,
  onSubmit,
  onCancel,
  creating,
  errors,
}: Props) {
  return (
    <Card className="mb-6 p-6">
      <h2 className="mb-4 text-lg font-semibold text-app-text">
        Create Experiment
      </h2>
      <div className="space-y-4">
        <FormField label="Name" error={errors.name}>
          <div className="flex items-center gap-2">
            <Input
              id="exp-name"
              placeholder="Experiment name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              maxLength={100}
              className="min-w-0 flex-1"
            />
            <span className="shrink-0 text-xs text-app-subtext">
              {name.length}/100
            </span>
          </div>
        </FormField>

        <div>
          <Label htmlFor="exp-desc" optional>
            Description
          </Label>
          <Textarea
            id="exp-desc"
            placeholder="What are you testing?"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={2}
          />
        </div>

        <FormField label="Reference Image" error={errors.file}>
          <ImageUploader onFileSelected={onFileSelected} />
        </FormField>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={onSubmit}
            disabled={creating}
            className="!bg-green-600 hover:!bg-green-500"
          >
            {creating ? "Creating..." : "Create"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
