import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface RichTextEditorProps {
  title: string;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function RichTextEditor({ title, initialContent, onSave, onCancel }: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onCancel}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-gray-900">编辑文档</h1>
                <p className="text-sm text-gray-500">{title}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button onClick={() => onSave(content)} className="bg-blue-500 hover:bg-blue-600">
                <Save className="w-4 h-4 mr-2" />
                保存文档
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入文档内容...&#10;&#10;支持多行文本编辑"
            className="w-full h-full min-h-[calc(100vh-200px)] resize-none border-0 focus:ring-0 text-base"
          />
        </div>
      </main>
    </div>
  );
}
