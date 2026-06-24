// components/InvestigationBoardAdminTab.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import { motion } from "framer-motion";
import { Loader2, ImagePlus, Link as LinkIcon, Trash2 } from "lucide-react";

export default function InvestigationBoardAdminTab({ showMsg }: { showMsg: any }) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [filterType, setFilterType] = useState("none");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const { data, error } = await supabase.from("investigation_board").select("*");
    if (error) console.error(error);
    if (data) setNodes(data);
    setIsLoading(false);
  }

  const openCloudinary = () => {
    setIsUploading(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
          uploadSignature: async (callback: any, paramsToSign: any) => {
            try {
              const res = await fetch("/api/cloudinary-sign", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paramsToSign }),
              });
              const { signature } = await res.json();
              callback(signature);
            } catch (err) { console.error("Erreur de signature", err); }
          },
          sources: ["local", "url"],
          resourceType: "image",
          folder: "lukeni/investigation_board",
          multiple: true,
        },
        (error: any, result: any) => {
          if (result?.event === "success") {
            createNode(result.info.secure_url, result.info.original_filename);
          }
          if (error || result?.event === "close") {
            setIsUploading(false);
          }
        }
      );
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  async function createNode(imageUrl: string, originalFilename: string) {
    const finalTitle = newTitle.trim() !== "" ? newTitle : originalFilename;

    const { data, error } = await supabase.from("investigation_board").insert([{
      title: finalTitle,
      image_url: imageUrl,
      filter_type: filterType,
      pos_x: Math.random() * 400 + 50,
      pos_y: Math.random() * 300 + 50,
      rotation: (Math.random() - 0.5) * 20
    }]).select().single();

    if (error) {
      showMsg("error", "Erreur d'insertion: " + error.message);
    } else {
      showMsg("success", "Photo ajoutée !");
      setNodes(prev => [...prev, data]);
      setNewTitle("");
    }
  }

  const handleDragEnd = async (id: string, info: any) => {
    const nodeIndex = nodes.findIndex(n => n.id === id);
    if (nodeIndex === -1) return;
    const newX = nodes[nodeIndex].pos_x + info.offset.x;
    const newY = nodes[nodeIndex].pos_y + info.offset.y;
    
    // Maj visuelle immédiate
    const updated = [...nodes];
    updated[nodeIndex].pos_x = newX;
    updated[nodeIndex].pos_y = newY;
    setNodes(updated);

    await supabase.from("investigation_board").update({ pos_x: newX, pos_y: newY }).eq("id", id);
  };

  const handleLinkClick = async (id: string) => {
    if (!linkingFrom) {
      setLinkingFrom(id); 
      showMsg("success", "Cliquez sur une autre photo pour lier.");
    } else {
      if (linkingFrom === id) { setLinkingFrom(null); return; }
      
      const fromNode = nodes.find(n => n.id === linkingFrom);
      const currentLinks = fromNode.linked_to || [];
      
      if (!currentLinks.includes(id)) {
        const newLinks = [...currentLinks, id];
        await supabase.from("investigation_board").update({ linked_to: newLinks }).eq("id", linkingFrom);
        showMsg("success", "Lien créé !");
        loadData();
      }
      setLinkingFrom(null);
    }
  };

  const deleteNode = async (id: string) => {
    if(!confirm("Supprimer cette photo définitivement ?")) return;
    
    const { error } = await supabase.from("investigation_board").delete().eq("id", id);
    if (error) {
      showMsg("error", "Erreur de suppression");
      return;
    }

    setNodes(prev => prev.filter(n => n.id !== id).map(n => ({
      ...n, linked_to: n.linked_to?.filter((linkId: string) => linkId !== id)
    })));
    showMsg("success", "Photo supprimée.");
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#D4AF37]" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Titre de l'indice</label>
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="bg-black border border-white/20 rounded p-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Filtre Image</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-black border border-white/20 rounded p-2 text-sm text-white">
            <option value="none">Normal</option>
            <option value="sepia">Sépia Ancien</option>
            <option value="grayscale">Noir & Blanc</option>
          </select>
        </div>
        <button onClick={openCloudinary} disabled={isUploading} className="flex items-center gap-2 bg-[#D4AF37] text-black font-bold px-4 py-2 rounded">
          {isUploading ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
          Uploader la photo
        </button>
      </div>

      <div className="relative w-full h-[600px] bg-[#0A0A0A] border-2 border-dashed border-white/20 overflow-hidden rounded-xl">
        {linkingFrom && <div className="absolute top-2 left-2 z-50 bg-red-500 text-white px-3 py-1 rounded text-xs animate-pulse">Mode Liaison actif</div>}
        
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {nodes.map(node => (
            node.linked_to?.map((targetId: string) => {
              const target = nodes.find(n => n.id === targetId);
              if (!target) return null;
              return (
                <line key={`${node.id}-${targetId}`} x1={node.pos_x + 60} y1={node.pos_y + 60} x2={target.pos_x + 60} y2={target.pos_y + 60} stroke="#D4AF37" strokeWidth="2" strokeDasharray="5,5" />
              )
            })
          ))}
        </svg>

        {nodes.map((node) => (
          <motion.div
            key={node.id}
            drag
            dragMomentum={false}
            onDragEnd={(e, info) => handleDragEnd(node.id, info)}
            initial={{ x: node.pos_x, y: node.pos_y, rotate: node.rotation }}
            className={`absolute z-10 w-[120px] bg-[#E8E8E8] p-2 shadow-xl cursor-grab border ${linkingFrom === node.id ? 'border-red-500 shadow-red-500/50' : 'border-gray-300'}`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 shadow-sm" />
            <div className={`w-full h-[80px] overflow-hidden ${node.filter_type === 'sepia' ? 'sepia contrast-125' : node.filter_type === 'grayscale' ? 'grayscale contrast-150' : ''}`}>
              <img src={node.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
            </div>
            <p className="text-[10px] text-black font-mono text-center mt-1 truncate">{node.title}</p>
            <div className="flex justify-center gap-2 mt-1 pt-1 border-t border-gray-300">
              <button onClick={() => handleLinkClick(node.id)} className="text-blue-600"><LinkIcon size={12} /></button>
              <button onClick={() => deleteNode(node.id)} className="text-red-600"><Trash2 size={12} /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}