from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from FlagEmbedding import BGEM3FlagModel
import torch
import os
import sys
from typing import Union
import time

# 屏蔽 transformers 的建议性警告
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "true"

# 解决 Mac 上可能出现的 OpenMP 冲突和 Tokenizer 并行死锁问题
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

print("Initializing BGE M3 Service...", file=sys.stderr)

try:
    print("Loading model...", file=sys.stderr)
    model = BGEM3FlagModel('BAAI/bge-m3')
    print("Model loaded successfully.", file=sys.stderr)
except Exception as e:
    print(f"CRITICAL ERROR loading model: {e}", file=sys.stderr)
    sys.exit(1)

class EmbeddingRequest(BaseModel):
    texts: list[str]
    return_dense: bool = True
    return_sparse: bool = False
    return_colbert: bool = False

class OpenAIEmbeddingRequest(BaseModel):
    input: Union[str, list[str]]
    model: str = "BAAI/bge-m3"

def make_serializable(obj):
    if hasattr(obj, "tolist"):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_serializable(v) for v in obj]
    return obj

app = FastAPI()

@app.get("/")
def health():
    return {"status": "ok"}

@app.post("/embed")
def embed(req: EmbeddingRequest):
    print(f"Received request for {len(req.texts)} texts")
    if not req.texts:
        raise HTTPException(status_code=400, detail="Input texts cannot be empty.")
    
    try:
        # FlagEmbedding 支持多种编码方式
        print("Start encoding...")
        
        # 动态构建参数，避免旧版本 FlagEmbedding 将不支持的参数传给 tokenizer 导致报错
        encode_kwargs = {
            "return_dense": req.return_dense,
            "return_sparse": req.return_sparse,
        }
        if req.return_colbert:
            encode_kwargs["return_colbert"] = True
            
        embeddings = model.encode(req.texts, **encode_kwargs)
        print("Encoding finished")
        
        return {"embeddings": make_serializable(embeddings)}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/embeddings")
def openai_embeddings(req: OpenAIEmbeddingRequest):
    print(f"Received OpenAI embedding request. Model: {req.model}, Input length: {len(req.input) if isinstance(req.input, list) else 1}")
    try:
        texts = [req.input] if isinstance(req.input, str) else req.input
        if not texts:
             raise HTTPException(status_code=400, detail="Input cannot be empty.")

        # BGE-M3 默认只返回 dense 向量以兼容 OpenAI 格式
        # 注意：不要传递 return_colbert=False，某些版本的 FlagEmbedding 会将其传给 tokenizer 导致报错
        embeddings_data = model.encode(texts, return_dense=True, return_sparse=False)
        
        # 如果只请求 dense，model.encode 可能直接返回 ndarray 或 tensor，也可能返回 dict
        # FlagEmbedding 的行为：如果只设 return_dense=True，它返回的是 dict 还是 array？
        # 查看源码或文档，BGEM3FlagModel.encode 默认返回 dict: {'dense_vecs': ...}
        
        dense_vecs = embeddings_data['dense_vecs'] if isinstance(embeddings_data, dict) else embeddings_data

        # 打印第一个向量的维度进行调试
        if len(dense_vecs) > 0:
            print(f"Generated vector dimension: {len(dense_vecs[0])}")

        data = []
        for i, vec in enumerate(dense_vecs):
            data.append({
                "object": "embedding",
                "embedding": make_serializable(vec),
                "index": i
            })

        return {
            "object": "list",
            "data": data,
            "model": req.model,
            "usage": {
                "prompt_tokens": 0, # 暂不计算
                "total_tokens": 0
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 运行：uvicorn bge_m3_service:app --host 0.0.0.0 --port 8000
#  curl -X POST http://127.0.0.1:8000/embed \
#   -H "Content-Type: application/json" \
#   -d '{"texts":["hello world","test"], "return_dense":true}'
#  curl -X POST http://127.0.0.1:8000/v1/embeddings \
#   -H "Content-Type: application/json" \
#   -d '{"input":["hello world","test"], "model":"bge-m3"}'
