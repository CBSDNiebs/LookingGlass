import re

with open("src/components/Dashboard.tsx", "r") as f:
    content = f.read()

new_notes_and_raw_data = """                    {/* Notes Section */}
                    <div className="col-span-1 sm:col-span-2 bg-[#f7f7f5] text-black p-4 rounded-xl mt-2 border border-black/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">Notes</span>
                        {user.uid === obs.uid && editingNotesId !== obs.id && (
                          <button onClick={() => startEditingNotes(obs)} className="text-gray-400 hover:text-black flex items-center gap-1 text-sm transition-colors">
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                        )}
                      </div>
                      {editingNotesId === obs.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            className="w-full p-3 rounded-xl border border-black/10 bg-[#f7f7f5] text-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none min-h-[100px] text-sm font-sans resize-y"
                            placeholder="Type notes here..."
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingNotesId(null)} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                            <button onClick={() => saveNotes(obs.id)} className="px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg transition flex items-center gap-1">
                              <Save className="w-4 h-4" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap text-sm font-sans">{obs.notes || <span className="text-gray-400 italic">No notes added.</span>}</p>
                      )}
                    </div>
                    
                    {/* Raw Data Toggle Section */}
                    <div className="col-span-1 sm:col-span-2 mt-4 border-t border-gray-100 pt-4">
                      <button 
                        onClick={() => {
                          const newExpanded = new Set(expandedRawDataIds);
                          if (newExpanded.has(obs.id)) {
                            newExpanded.delete(obs.id);
                          } else {
                            newExpanded.add(obs.id);
                          }
                          setExpandedRawDataIds(newExpanded);
                        }}
                        className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          <Table className="w-4 h-4" />
                          <span>Raw Data ({(obs.events || []).length} events)</span>
                        </div>
                        <div className="text-gray-400">
                          {expandedRawDataIds.has(obs.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      
                      {expandedRawDataIds.has(obs.id) && (
                        <div className="mt-4 max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-inner">
                          <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                              <tr>
                                <th scope="col" className="px-6 py-3">Time</th>
                                <th scope="col" className="px-6 py-3">Event Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(obs.events || []).map((event, idx) => (
                                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                  <td className="px-6 py-3 font-mono font-medium text-gray-900">{formatElapsed(event.tMs)}</td>
                                  <td className="px-6 py-3 capitalize">{event.kind.replace(/([A-Z])/g, ' $1').trim()}</td>
                                </tr>
                              ))}
                              {(!obs.events || obs.events.length === 0) && (
                                <tr>
                                  <td colSpan={2} className="px-6 py-4 text-center text-gray-500 italic">No events recorded</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>"""

# Ensure we're targeting the right block to replace.
pattern = re.compile(r'\{\/\* Notes Section \*\/\}[\s\S]*?(?=\<\/div\>\s*\<\/div\>\s*\<\/div\>\s*\<\/div\>\s*\<\/div\>\s*\{)', re.MULTILINE)
# Wait, this regex might be tricky. Let's do a strict string replace instead.

start_str = "{/* Notes Section */}"
end_str = ")}                             </div>                           </div>                         </div>                       </div>                     ))}                   </div>                 )}                 </div>               </div>             </div>           );"

content_parts = content.split(start_str)
if len(content_parts) == 2:
    end_parts = content_parts[1].split('</div>\n                  </div>\n                </div>\n              </div>\n            ))}')
    if len(end_parts) >= 2:
        new_content = content_parts[0] + new_notes_and_raw_data + '\n                  </div>\n                </div>\n              </div>\n            ))}' + '</div>\n                  </div>\n                </div>\n              </div>\n            ))}'.join(end_parts[1:])
        with open("src/components/Dashboard.tsx", "w") as f:
            f.write(new_content)
        print("Patched successfully")
    else:
        print("End string not found")
else:
    print("Start string not found")

