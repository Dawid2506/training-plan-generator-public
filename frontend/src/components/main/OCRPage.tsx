import { useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const OCRPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setExtractedText("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a PDF file first");
      return;
    }

    setLoading(true);
    // TODO: Add upload logic here
    console.log("Uploading file:", selectedFile.name);
    
    setTimeout(() => {
      setLoading(false);
      alert("Upload functionality coming soon!");
    }, 1000);
  };

  return (
    <div className="h-full w-full p-4 text-black">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>OCR - PDF Recognition</CardTitle>
          <CardDescription>
            Upload PDF files for text recognition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  Click to select PDF file
                </span>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm">{selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  Remove
                </Button>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="w-full"
            >
              {loading ? "Processing..." : "Upload PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extracted Text</CardTitle>
          <CardDescription>
            Text extracted from the PDF will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-64 max-h-96 overflow-y-auto p-4 border rounded bg-gray-50">
            {extractedText ? (
              <pre className="whitespace-pre-wrap text-sm">{extractedText}</pre>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No text extracted yet. Upload a PDF to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OCRPage;
