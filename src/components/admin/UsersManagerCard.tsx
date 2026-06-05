import { useState, useEffect } from "react";
import { User, Shield, ShieldAlert, Trash2, Plus, Edit2, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// We assume we receive these from the parent or fetch them inside.
// Since the prompt asks for "inline save" when "Save All Changes" is clicked,
// we will export a hook or component that manages local draft state
// and exposes a getDrafts() method to the parent.
// However, the easiest React way is to pass `users` and `setUsers` from AdminDashboard to this card,
// OR just do it internally and save immediately? Wait, the prompt specifically says:
// "When the "Save All Changes" button is clicked, all user-related changes should be validated and saved to the database"

export function UsersManagerCard({ usersDraft, setUsersDraft, userRole }: { usersDraft: any[], setUsersDraft: any, userRole?: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  // Handlers
  const handleAdd = () => {
    if (editingId !== null) {
      setUsersDraft((prev: any[]) => prev.filter(x => !(x._isNew && !x.email)));
    }
    const newId = "new-" + Date.now();
    const newUser = {
      id: newId,
      email: "",
      password: "",
      userrole: "admin",
      is_active: 1,
      _isNew: true,
    };
    setUsersDraft((prev: any[]) => [...prev, newUser]);
    setEditingId(newId);
    setEditForm({ ...newUser });
  };

  const handleEdit = (u: any) => {
    setEditingId(u.id);
    setEditForm({ ...u }); 
  };

  const handleSaveInline = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailToSave = (editForm.email || "").trim();
    if (!emailToSave || !emailRegex.test(emailToSave)) {
      toast.error("A valid email address is required.");
      return;
    }
    
    const isNewUser = usersDraft.find((x: any) => x.id === editingId)?._isNew;
    if (isNewUser && (!editForm.password || editForm.password.trim() === "")) {
      toast.error("Password is required for new users.");
      return;
    }

    setUsersDraft((prev: any[]) => prev.map(u => {
      if (u.id === editingId) {
        return {
          ...u,
          email: emailToSave,
          password: editForm.password ? editForm.password : u.password,
          userrole: editForm.userrole,
          is_active: editForm.is_active,
          _updated: !u._isNew
        };
      }
      return u;
    }));
    
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setUsersDraft((prev: any[]) => prev.map(u => {
      if (u.id === id) {
        return { ...u, _deleted: true };
      }
      return u;
    }));
  };

  const handleCancel = (u: any) => {
    if (u._isNew && !u.email) {
      setUsersDraft((prev: any[]) => prev.filter(x => x.id !== u.id));
    }
    setEditingId(null);
  };

  const activeUsers = usersDraft.filter((u: any) => !u._deleted);

  return (
    <div className="glass-card w-full p-6 lg:p-8 mt-8 border-t border-border/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-border/50 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-inner">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">System Users & Access</h3>
            <p className="text-[0.625rem] text-muted-foreground font-medium uppercase tracking-widest opacity-60 mt-0.5">Manage administrators and permissions</p>
          </div>
        </div>
          <button
            disabled={userRole === "viewer"}
            onClick={handleAdd}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/10 disabled:hover:text-emerald-500"
          >
            <Plus size={10} /> Add User
          </button>
      </div>

      <div className="bg-muted/20 rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/40">
                <th className="px-4 py-3 text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest">Email</th>
                <th className="px-4 py-3 text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest">Role</th>
                <th className="px-4 py-3 text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest">Password</th>
                <th className="px-4 py-3 text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                activeUsers.map((u: any) => {
                  const isEditing = editingId === u.id;
                  
                  return (
                    <tr key={u.id} className="border-b border-border/30 hover:bg-muted/10 transition-colors last:border-0">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input 
                            type="email" 
                            value={editForm.email || ""} 
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                            className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-xs focus:border-secondary outline-none" 
                            placeholder="user@example.com"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                              <User size={12} />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{u.email}</span>
                          </div>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select 
                            value={editForm.userrole || "admin"} 
                            onChange={e => setEditForm({ ...editForm, userrole: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-xs outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider">
                            {u.userrole || "admin"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <button 
                            type="button"
                            onClick={() => setEditForm({ ...editForm, is_active: editForm.is_active ? 0 : 1 })}
                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${editForm.is_active ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"}`}
                          >
                            {editForm.is_active ? "Active" : "Inactive"}
                          </button>
                        ) : (
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${u.is_active ? "text-emerald-500" : "text-destructive"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-destructive"}`} />
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input 
                            type="password" 
                            value={editForm.password || ""} 
                            onChange={e => setEditForm({ ...editForm, password: e.target.value })} 
                            className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-xs focus:border-secondary outline-none" 
                            placeholder={u._isNew ? "Enter password" : "Leave blank to keep"}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs opacity-50">••••••••</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleCancel(u)} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors" title="Cancel">
                              <X size={14} />
                            </button>
                            <button onClick={handleSaveInline} className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-500 hover:text-white transition-colors" title="Save">
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button disabled={userRole === "viewer"} onClick={() => handleEdit(u)} className="p-1.5 rounded hover:bg-secondary/10 text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Edit">
                                <Edit2 size={14} />
                              </button>
                              <button disabled={userRole === "viewer"} onClick={() => handleDelete(u.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
