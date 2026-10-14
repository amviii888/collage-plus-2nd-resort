'use client';

import React, { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  GraduationCap, 
  Key, 
  Phone, 
  FileSpreadsheet, 
  UserCheck, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { getAdminCustomTeacherCodes, normalizeImagePath } from '@/lib/professors-registry';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface TeacherInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any | null;
  allStudents: any[];
}

export function TeacherInfoModal({ isOpen, onClose, teacher, allStudents }: TeacherInfoModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Determine the primary code of this teacher
  const teacherCode = useMemo(() => {
    if (!teacher) return '';
    const customCodes = getAdminCustomTeacherCodes();
    const customMatch = Object.values(customCodes).find(c => 
      c.id === teacher.id || 
      c.name === teacher.name || 
      (teacher.code && c.code === teacher.code)
    );
    const code = customMatch?.code || teacher.code || teacher.teacherCode || teacher.assistantCode || '';
    return (code || '').trim().toUpperCase();
  }, [teacher]);

  // Filter students who entered/used this doctor's code
  const connectedStudents = useMemo(() => {
    if (!teacher || !allStudents) return [];
    
    return allStudents.filter(student => {
      if (!student) return false;
      const pCode = ((student as any).professorCode || (student as any).teacherCode || '').trim().toUpperCase();
      const cArray = Array.isArray((student as any).connectedProfessors) 
        ? (student as any).connectedProfessors.map((c: any) => (c || '').trim().toUpperCase()) 
        : [];
      const tId = (student as any).teacherId;
      const tEmail = (student as any).teacherEmail;

      return (
        (teacherCode && pCode === teacherCode) ||
        (teacherCode && cArray.includes(teacherCode)) ||
        (teacher.id && tId === teacher.id) ||
        (teacher.email && tEmail === teacher.email)
      );
    });
  }, [allStudents, teacher, teacherCode]);

  // Filtered by student search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return connectedStudents;
    const q = searchQuery.toLowerCase().trim();
    return connectedStudents.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.barcodeId || s.code || '').toLowerCase().includes(q) ||
      (s.phoneNumber || s.phone || '').includes(q) ||
      (s.academicYear || s.grade || '').toLowerCase().includes(q)
    );
  }, [connectedStudents, searchQuery]);

  const handleExportExcel = () => {
    if (!connectedStudents.length) return;
    const exportData = connectedStudents.map((s, idx) => ({
      '#': idx + 1,
      'اسم الطالب': s.name || 'طالب',
      'كود الطالب': s.barcodeId || s.code || '---',
      'رقم الهاتف': s.phoneNumber || s.phone || '---',
      'الفرقة / السنة الدراسية': s.academicYear || s.grade || '---',
      'تاريخ الانضمام': s.createdAt || s.registeredAt ? new Date(s.createdAt || s.registeredAt).toLocaleDateString('ar-EG') : '---'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلاب المربوطون');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `طلاب_الدكتور_${teacher?.name || 'teacher'}_${teacherCode}.xlsx`);
  };

  if (!teacher) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-[#09090b] border border-zinc-800 text-zinc-100 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader className="space-y-3 pb-4 border-b border-zinc-800 text-right">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 rounded-2xl border-2 border-emerald-500/30 shadow-md">
                <AvatarImage src={normalizeImagePath(teacher.profilePictureUrl || teacher.pfp || teacher.avatarUrl)} />
                <AvatarFallback className="bg-emerald-950 text-emerald-400 font-bold text-lg">
                  {teacher.name?.slice(0, 2) || 'DR'}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                  <span>{teacher.name}</span>
                  {teacherCode && (
                    <Badge className="bg-emerald-600 text-zinc-950 font-mono font-black text-xs px-2.5 py-0.5 rounded-lg">
                      [{teacherCode}]
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-1">
                  {teacher.subjects?.join(', ') || teacher.subject || 'عضو هيئة التدريس'} • {teacher.email}
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/30 text-emerald-400 text-xs px-3 py-1 font-bold flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>حساب نشط ومعتمد</span>
            </Badge>
          </div>
        </DialogHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-zinc-900 border border-emerald-500/30 space-y-1">
            <span className="text-xs font-semibold text-zinc-400 block flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>عدد الطلاب الذين أدخلوا الكود</span>
            </span>
            <div className="text-3xl font-black text-emerald-400 flex items-baseline gap-1">
              <span>{connectedStudents.length}</span>
              <span className="text-xs font-normal text-zinc-400">طالب</span>
            </div>
            <p className="text-[10px] text-zinc-400">
              إجمالي الطلاب المربوطين بكود الدكتور
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <span className="text-xs font-semibold text-zinc-400 block flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>كود الدكتور المخصص</span>
            </span>
            <div className="text-2xl font-mono font-black text-amber-400">
              {teacherCode || 'غير مربوط'}
            </div>
            <p className="text-[10px] text-zinc-400">
              الكود المستخدم لدخول منصة المحاضرات
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <span className="text-xs font-semibold text-zinc-400 block flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
              <span>كود المساعد (Assistant)</span>
            </span>
            <div className="text-xl font-mono font-bold text-blue-300 truncate">
              {teacher.assistantCode || '---'}
            </div>
            <p className="text-[10px] text-zinc-400">
              كود الدخول المخصص لمساعد الدكتور
            </p>
          </div>
        </div>

        {/* Students List Section */}
        <div className="flex-1 flex flex-col min-h-0 space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>قائمة الطلاب الذين أدخلوا كود الدكتور ({connectedStudents.length})</span>
            </h3>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الطالب أو الكود..."
                  className="pr-8 h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>

              {connectedStudents.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  className="h-8 px-2.5 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40 font-bold gap-1 shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تصدير Excel</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-2xl bg-zinc-950/60 divide-y divide-zinc-800/80 p-1 min-h-[160px]">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, idx) => (
                <div key={student.id || idx} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/50 transition-colors rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-zinc-100 block">
                        {student.name || 'طالب غير مسمى'}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span className="font-mono text-emerald-400">كود الطالب: {student.barcodeId || student.code || '---'}</span>
                        {student.phoneNumber && (
                          <span className="flex items-center gap-1 text-zinc-400 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            {student.phoneNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 text-[10px] font-medium">
                      {student.academicYear || student.grade || 'جامعي'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 space-y-2">
                <Info className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-xs text-zinc-400 font-medium">
                  {searchQuery ? 'لا يوجد طلاب يطابقون كلمة البحث.' : 'لم يقم أي طالب بإدخال كود هذا الدكتور حتى الآن.'}
                </p>
                <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                  عندما يربط الطلاب حساباتهم بكود هذا الدكتور [{teacherCode || '---'}], سيظهرون تلقائياً في هذه القائمة.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 text-xs font-bold"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
