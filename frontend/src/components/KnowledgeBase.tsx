import { useState, type ChangeEvent } from 'react';
import { Upload, FileText, Search, Filter, Edit, Trash2, Eye, Plus, Check, X, FolderTree, Tag, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useStore, type Document, type Category, type SubCategory } from '../store/useStore';

interface KnowledgeBaseProps {
  onOpenEditor: (state: {
    isOpen: boolean;
    title: string;
    content: string;
    category: string;
    subCategory: string;
    status: 'active' | 'inactive';
    onSave: (content: string) => void;
  }) => void;
}

export function KnowledgeBase({ onOpenEditor }: KnowledgeBaseProps) {
  const {
    documents,
    categories,
    setDocuments,
    addDocument,
    updateDocument,
    deleteDocument: removeDocument,
    addCategory,
    updateCategory,
    deleteCategory: removeCategory,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddSubCategoryDialogOpen, setIsAddSubCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<{ category: Category; subCategory: SubCategory } | null>(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState<Category | null>(null);
  const [inputMethod, setInputMethod] = useState<'richtext' | 'pdf'>('richtext');
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: '',
    subCategory: '',
    content: '',
    status: 'active' as 'active' | 'inactive',
    fileType: 'text' as 'text' | 'pdf',
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSubCategory = filterSubCategory === 'all' || doc.subCategory === filterSubCategory;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;

    return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus;
  });

  const availableSubCategories = filterCategory === 'all'
    ? []
    : categories.find(c => c.name === filterCategory)?.subCategories || [];

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      subCategories: [],
    };
    addCategory(newCategory);
    setNewCategoryName('');
    setIsAddCategoryDialogOpen(false);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setIsAddCategoryDialogOpen(true);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    updateCategory(editingCategory.id, { name: newCategoryName });

    // Also update documents that use this category
    // Note: In a real app with relational DB, this might be handled differently
    // Here we manually update documents for consistency in the UI
    const updatedDocs = documents.map(doc =>
      doc.category === editingCategory.name
        ? { ...doc, category: newCategoryName }
        : doc
    );
    setDocuments(updatedDocs);

    setEditingCategory(null);
    setNewCategoryName('');
    setIsAddCategoryDialogOpen(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    const hasDocuments = documents.some(doc => doc.category === category.name);
    if (hasDocuments) {
      alert('该业务分类下存在文档，无法删除。请先删除或移动相关文档。');
      return;
    }
    if (confirm(`确定要删除业务分类"${category.name}"吗？`)) {
      removeCategory(categoryId);
    }
  };

  const handleAddSubCategory = () => {
    if (!selectedCategoryForSub || !newSubCategoryName.trim()) return;
    const newSubCategory: SubCategory = {
      id: `${selectedCategoryForSub.id}-${Date.now()}`,
      name: newSubCategoryName,
    };

    const updatedCategory = {
      ...selectedCategoryForSub,
      subCategories: [...selectedCategoryForSub.subCategories, newSubCategory]
    };
    updateCategory(selectedCategoryForSub.id, updatedCategory);

    setNewSubCategoryName('');
    setSelectedCategoryForSub(null);
    setIsAddSubCategoryDialogOpen(false);
  };

  const handleEditSubCategory = (category: Category, subCategory: SubCategory) => {
    setEditingSubCategory({ category, subCategory });
    setSelectedCategoryForSub(category);
    setNewSubCategoryName(subCategory.name);
    setIsAddSubCategoryDialogOpen(true);
  };

  const handleUpdateSubCategory = () => {
    if (!editingSubCategory || !newSubCategoryName.trim()) return;
    const { category, subCategory } = editingSubCategory;

    const updatedSubCategories = category.subCategories.map(sub =>
      sub.id === subCategory.id
        ? { ...sub, name: newSubCategoryName }
        : sub
    );

    updateCategory(category.id, { subCategories: updatedSubCategories });

    // Update documents
    const updatedDocs = documents.map(doc =>
      doc.category === category.name && doc.subCategory === subCategory.name
        ? { ...doc, subCategory: newSubCategoryName }
        : doc
    );
    setDocuments(updatedDocs);

    setEditingSubCategory(null);
    setNewSubCategoryName('');
    setSelectedCategoryForSub(null);
    setIsAddSubCategoryDialogOpen(false);
  };

  const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const subCategory = category?.subCategories.find(s => s.id === subCategoryId);
    if (!category || !subCategory) return;
    const hasDocuments = documents.some(
      doc => doc.category === category.name && doc.subCategory === subCategory.name
    );
    if (hasDocuments) {
      alert('该场景分类下存在文档，无法删除。请先删除或移动相关文档。');
      return;
    }
    if (confirm(`确定要删除场景分类"${subCategory.name}"吗？`)) {
      const updatedSubCategories = category.subCategories.filter(sub => sub.id !== subCategoryId);
      updateCategory(categoryId, { subCategories: updatedSubCategories });
    }
  };

  const handleProceedToEditor = () => {
    if (!newDoc.title || !newDoc.category || !newDoc.subCategory) {
      alert('请填写完整的文档信息');
      return;
    }

    if (inputMethod === 'richtext') {
      setIsAddDialogOpen(false);
      onOpenEditor({
        isOpen: true,
        title: newDoc.title,
        content: newDoc.content,
        category: newDoc.category,
        subCategory: newDoc.subCategory,
        status: newDoc.status,
        onSave: (content: string) => {
          const document: Document = {
            id: Date.now().toString(),
            title: newDoc.title,
            category: newDoc.category,
            subCategory: newDoc.subCategory,
            status: newDoc.status,
            uploadDate: new Date(),
            content: content,
            fileType: 'text',
          };
          addDocument(document);
          setNewDoc({ title: '', category: '', subCategory: '', content: '', status: 'active', fileType: 'text' });
          setInputMethod('richtext');
        }
      });
    } else {
      // PDF upload - complete immediately
      handleAddDocument();
    }
  };

  const handleAddDocument = () => {
    const document: Document = {
      id: Date.now().toString(),
      title: newDoc.title,
      category: newDoc.category,
      subCategory: newDoc.subCategory,
      status: newDoc.status,
      uploadDate: new Date(),
      content: newDoc.content,
      fileType: inputMethod === 'pdf' ? 'pdf' : 'text',
    };
    addDocument(document);
    setNewDoc({ title: '', category: '', subCategory: '', content: '', status: 'active', fileType: 'text' });
    setInputMethod('richtext');
    setIsAddDialogOpen(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name;
      setNewDoc({
        ...newDoc,
        content: `已上传文件: ${fileName}`,
      });
    }
  };

  const toggleStatus = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      updateDocument(id, { status: doc.status === 'active' ? 'inactive' : 'active' });
    }
  };

  const deleteDocument = (id: string) => {
    if (confirm('确定要删除这个文档吗？')) {
      removeDocument(id);
    }
  };

  const selectedCategory = categories.find(c => c.name === newDoc.category);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            文档管理
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            分类管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-gray-900 mb-1">知识库管理</h2>
                <p className="text-sm text-gray-500">管理所有业务知识文档，支持分类、上传和状态控制</p>
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    添加文档
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>添加知识文档</DialogTitle>
                    <DialogDescription>
                      选择录入方式：富文本编辑或上传PDF
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 mt-4 overflow-y-auto pr-2">
                    <div>
                      <Label className="text-sm text-gray-700 mb-3 block">录入方式</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setInputMethod('richtext')}
                          className={`p-4 rounded-lg border-2 transition-all ${inputMethod === 'richtext'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <FileText className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                          <p className="text-sm text-gray-900">富文本编辑</p>
                        </button>
                        <button
                          onClick={() => setInputMethod('pdf')}
                          className={`p-4 rounded-lg border-2 transition-all ${inputMethod === 'pdf'
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <Upload className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                          <p className="text-sm text-gray-900">上传PDF</p>
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-700 mb-2 block">文档标题</Label>
                      <Input
                        placeholder="请输入文档标题"
                        value={newDoc.title}
                        onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-700 mb-2 block">业务分类</Label>
                        <Select value={newDoc.category} onValueChange={(value) => setNewDoc({ ...newDoc, category: value, subCategory: '' })}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择业务分类" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm text-gray-700 mb-2 block">场景分类</Label>
                        <Select
                          value={newDoc.subCategory}
                          onValueChange={(value) => setNewDoc({ ...newDoc, subCategory: value })}
                          disabled={!newDoc.category}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择场景分类" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedCategory?.subCategories.map(sub => (
                              <SelectItem key={sub.id} value={sub.name}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {inputMethod === 'pdf' && (
                      <div>
                        <Label className="text-sm text-gray-700 mb-2 block">上传PDF文件</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                          <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">点击或拖拽上传PDF文件</p>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="pdf-upload"
                          />
                          <label htmlFor="pdf-upload">
                            <Button type="button" variant="outline" className="mt-2" asChild>
                              <span>选择文件</span>
                            </Button>
                          </label>
                          {newDoc.content && (
                            <p className="text-sm text-green-600 mt-3">{newDoc.content}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm text-gray-700 mb-2 block">文档状态</Label>
                      <RadioGroup
                        value={newDoc.status}
                        onValueChange={(value: 'active' | 'inactive') => setNewDoc({ ...newDoc, status: value })}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="active" id="status-active" />
                          <Label htmlFor="status-active" className="cursor-pointer">生效中</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="inactive" id="status-inactive" />
                          <Label htmlFor="status-inactive" className="cursor-pointer">已失效</Label>
                        </div>
                      </RadioGroup>
                      <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-800">
                          <strong>生效中</strong>：文档将用于大模型RAG查询，智能问答可以引用此文档内容<br />
                          <strong>已失效</strong>：文档仅作归档保存，不参与智能问答检索
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        取消
                      </Button>
                      <Button
                        onClick={handleProceedToEditor}
                        disabled={!newDoc.title || !newDoc.category || !newDoc.subCategory || (inputMethod === 'pdf' && !newDoc.content)}
                      >
                        {inputMethod === 'richtext' ? '下一步' : '保存'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索文档标题或内容..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={filterCategory} onValueChange={(value) => {
                setFilterCategory(value);
                setFilterSubCategory('all');
              }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="业务分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部业务</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterSubCategory}
                onValueChange={setFilterSubCategory}
                disabled={filterCategory === 'all'}
              >
                <SelectTrigger className="w-[180px]">
                  <Tag className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="场景分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部场景</SelectItem>
                  {availableSubCategories.map(sub => (
                    <SelectItem key={sub.id} value={sub.name}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">生效中</SelectItem>
                  <SelectItem value="inactive">已失效</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      文档标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      上传时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{doc.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{doc.content}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{doc.category}</p>
                          <p className="text-gray-500">{doc.subCategory}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {doc.uploadDate.toLocaleDateString('zh-CN')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={doc.status === 'active' ? 'default' : 'secondary'}>
                          {doc.status === 'active' ? '生效中' : '已失效'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(doc.id)}
                          >
                            {doc.status === 'active' ? (
                              <X className="w-4 h-4 text-orange-500" />
                            ) : (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredDocuments.length === 0 && (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无文档</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {categories.map(category => {
              const count = documents.filter(d => d.category === category.name && d.status === 'active').length;
              return (
                <div key={category.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-2xl text-blue-600 mb-1">{count}</p>
                  <p className="text-xs text-gray-500">个生效文档</p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-gray-900 mb-1">分类管理</h2>
                <p className="text-sm text-gray-500">管理业务分类和场景分类的两级结构</p>
              </div>

              <Button onClick={() => {
                setEditingCategory(null);
                setNewCategoryName('');
                setIsAddCategoryDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                添加业务分类
              </Button>
            </div>

            <div className="space-y-4">
              {categories.map(category => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FolderTree className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-500">{category.subCategories.length} 个场景分类</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCategoryForSub(category);
                          setEditingSubCategory(null);
                          setNewSubCategoryName('');
                          setIsAddSubCategoryDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加场景
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {category.subCategories.length > 0 && (
                    <div className="ml-12 space-y-2">
                      {category.subCategories.map(subCat => (
                        <div
                          key={subCat.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{subCat.name}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSubCategory(category, subCat)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubCategory(category.id, subCat.id)}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {categories.length === 0 && (
                <div className="py-12 text-center">
                  <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无分类</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddCategoryDialogOpen} onOpenChange={(open) => {
        setIsAddCategoryDialogOpen(open);
        if (!open) {
          setEditingCategory(null);
          setNewCategoryName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? '编辑业务分类' : '添加业务分类'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? '修改业务分类名称' : '创建新的业务分类'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm text-gray-700 mb-2 block">分类名称</Label>
              <Input
                placeholder="请输入业务分类名称"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAddCategoryDialogOpen(false);
                setEditingCategory(null);
                setNewCategoryName('');
              }}>
                取消
              </Button>
              <Button
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                {editingCategory ? '更新' : '添加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSubCategoryDialogOpen} onOpenChange={(open) => {
        setIsAddSubCategoryDialogOpen(open);
        if (!open) {
          setEditingSubCategory(null);
          setSelectedCategoryForSub(null);
          setNewSubCategoryName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubCategory ? '编辑场景分类' : '添加场景分类'}</DialogTitle>
            <DialogDescription>
              {editingSubCategory
                ? '修改场景分类名称'
                : `为"${selectedCategoryForSub?.name}"添加场景分类`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm text-gray-700 mb-2 block">场景名称</Label>
              <Input
                placeholder="请输入场景分类名称"
                value={newSubCategoryName}
                onChange={(e) => setNewSubCategoryName(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAddSubCategoryDialogOpen(false);
                setEditingSubCategory(null);
                setSelectedCategoryForSub(null);
                setNewSubCategoryName('');
              }}>
                取消
              </Button>
              <Button
                onClick={editingSubCategory ? handleUpdateSubCategory : handleAddSubCategory}
                disabled={!newSubCategoryName.trim()}
              >
                {editingSubCategory ? '更新' : '添加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
